import { batcher, globalContextStack, globalObserversStack } from "./internals/globalVariables";
import { Reactive, SignalObserver, nextObserverId, amortizedCleanup } from "./internals/types";

/**
 * Nodo derivado síncrono del grafo reactivo con evaluación perezosa (lazy).
 * Actúa de manera dual: es un observador (`SignalObserver`) que se suscribe a sus dependencias aguas arriba,
 * y un productor (`Reactive<T>`) que difunde sus actualizaciones a observadores aguas abajo.
 * * @template T Tipo del valor calculado y cacheado en el nodo.
 */
export class ComputedSignal<T> implements SignalObserver, Reactive<T> {
    /**
     * Identificador numérico único asignado al nacer para indexar este nodo como observador en otros mapas.
     */
    public readonly id: number = nextObserverId();

    private readonly _computedFn: () => T;
    private _isDirty: boolean = true;
    private _cachedValue!: T;

    /**
     * Mapa de observadores que dependen del resultado de esta señal computada.
     * Indexado por ID único para desuscripción en $O(1)$.
     */
    private _observers = new Map<number, WeakRef<SignalObserver>>();

    /** Conjunto de dependencias activas de las cuales este nodo extrae información. */
    private _dependencies = new Set<Reactive<unknown>>();

    /** Nivel dinámico en la ordenación topológica del DAG. Inicialmente 0. */
    public level: number = 0;

    /**
     * Instancia un nuevo nodo reactivo derivado y lo asocia al contexto raíz activo si existe.
     * * @param computedFn La función pura de cálculo síncrono que genera el valor.
     */
    constructor(computedFn: () => T) {
        this._computedFn = computedFn;
        const currentScope = globalContextStack.peek();
        if (currentScope) {
            currentScope.addPrimitive(this);
        }
    }

    /**
     * Lee el valor de la computada de forma síncrona.
     * Si el nodo está marcado como sucio (`_isDirty`), ejecuta el re-cálculo y la reconstrucción
     * dinámica del grafo de dependencias, almacenando en caché el nuevo resultado.
     * Registra de forma automática al observador que está leyendo este nodo en la pila global.
     * * @returns El valor evaluado y cacheado de tipo `T`.
     * @complexity $O(1)$ si el valor está cacheado; $O(D)$ donde $D$ es el árbol de dependencias si requiere recalcular.
     */
    get value(): T {
        if (this._isDirty) {
            this._cachedValue = this.recompute();
            this._isDirty = false;
        }
        const currentObserver = globalObserversStack.peek();
        if (currentObserver) {
            currentObserver.trackDependency(this);
        }
        return this._cachedValue;
    }

    /**
     * Marca síncronamente el nodo como sucio, indicando que el caché actual ya no es válido.
     */
    markDirty(): void {
        if (!this._isDirty) {
            this._isDirty = true;
        }
    }

    /**
     * Responde a la notificación de cambio proveniente de una dependencia aguas arriba.
     * Si no estaba marcado como sucio, asume la invalidación, se marca como tal y propaga
     * la invalidación síncrona en cascada a todos sus suscriptores aguas abajo.
     */
    notify(): void {
        if (!this._isDirty) {
            this._isDirty = true;
            this.notifyObservers();
        }
    }

    /**
     * Interfaz obligatoria de `SignalObserver`. Las computadas al ser de naturaleza perezosa
     * no se programan de forma proactiva en el planificador; se evalúan al ser leídas.
     */
    run(): void { }

    /**
     * Desmantela el nodo liberando todas sus suscripciones ascendentes y limpiando sus observadores descendentes.
     */
    dispose(): void {
        this._cleanup();
        this._observers.clear();
    }

    /**
     * Registra una dependencia de entrada activa.
     * Si es una dependencia nueva, se suscribe síncronamente y evalúa la ordenación del nivel topológico.
     * Si el nivel del productor de entrada es igual o superior al nivel actual, el nivel de este nodo
     * se actualiza como $\text{dep.level} + 1$ y se propaga de manera síncrona y recursiva hacia todos sus observadores.
     * * @param dep El nodo reactivo que actúa como productor de entrada.
     * @complexity $O(1)$ promedio; $O(O)$ si requiere propagar recursivamente el recálculo de nivel topológico.
     */
    trackDependency(dep: Reactive<unknown>): void {
        if (this._dependencies.has(dep)) return;
        this._dependencies.add(dep);
        dep.subscribe(this);

        if (dep.level >= this.level) {
            const oldLevel = this.level;
            this.level = dep.level + 1;

            if (batcher && typeof batcher.updateNodeLevel === 'function') {
                batcher.updateNodeLevel(this, oldLevel, this.level);
            }

            this.propagateLevelUpdate();
        }
    }

    /**
     * Ajusta recursivamente el nivel topológico del nodo a un valor superior,
     * transfiriendo el nodo en el planificador síncrono si es necesario y propagando el nivel corregido.
     * * @param newLevel El nuevo nivel topológico propuesto.
     */
    public updateLevel(newLevel: number): void {
        if (newLevel > this.level) {
            const oldLevel = this.level;
            this.level = newLevel;

            if (batcher && typeof batcher.updateNodeLevel === 'function') {
                batcher.updateNodeLevel(this, oldLevel, this.level);
            }

            this.propagateLevelUpdate();
        }
    }

    /**
     * Propaga recursivamente los cambios de nivel topológico aguas abajo a todos los observadores adscritos.
     */
    private propagateLevelUpdate(): void {
        for (const [id, ref] of this._observers.entries()) {
            const observer = ref.deref();
            if (observer) {
                if ('updateLevel' in observer && typeof (observer as any).updateLevel === 'function') {
                    (observer as any).updateLevel(this.level + 1);
                }
            } else {
                this._observers.delete(id);
            }
        }
    }

    /**
     * Suscribe un observador a las actualizaciones de este nodo computado.
     * El registro se realiza en tiempo constante $O(1)$.
     * * @param observer El consumidor reactivo.
     * @complexity $O(1)$
     */
    subscribe(observer: SignalObserver): void {
        this._observers.set(observer.id, new WeakRef(observer));
    }

    /**
     * Desvincula un observador directo.
     * Evita recorridos lineales y elimina síncronamente al observador usando su ID.
     * * @param observer El consumidor reactivo a dar de baja.
     * @complexity $O(1)$ estricto.
     */
    unsubscribe(observer: SignalObserver): void {
        this._observers.delete(observer.id);
    }

    /**
     * Re-ejecuta la función de cálculo de forma aislada.
     * Realiza un saneamiento previo de dependencias, empuja este nodo a la pila activa
     * de observadores para el rastreo dinámico, y captura las dependencias invocadas en el callback.
     */
    private recompute(): T {
        this._cleanup();
        globalObserversStack.push(this);
        let result: T;
        try {
            result = this._computedFn();
        } finally {
            globalObserversStack.pop();
        }
        return result;
    }

    /**
     * Difunde síncronamente la notificación de invalidación de estado a los consumidores directos.
     * Aplica la limpieza amortizada para remover observadores recolectados por el GC.
     */
    private notifyObservers(): void {
        amortizedCleanup(this._observers);

        for (const [id, ref] of this._observers.entries()) {
            const observer = ref.deref();
            if (observer) {
                observer.notify();
            } else {
                this._observers.delete(id);
            }
        }
    }

    /**
     * Libera de forma ordenada los enlaces con todos los productores aguas arriba y vacía las dependencias locales.
     */
    private _cleanup(): void {
        this._dependencies.forEach(dep => dep.unsubscribe(this));
        this._dependencies.clear();
    }
}