import { batcher, globalContextStack, globalObserversStack } from "./internals/globalVariables";
import { EffectFn, Reactive, SignalObserver, nextObserverId } from "./internals/types";

/**
 * Consumidor reactivo final (hoja de salida) del grafo de dependencias reactivas de Pulse.
 * Diseñado para coordinar y ejecutar efectos secundarios imperativos cuando mutan sus dependencias directas.
 */
export class Effect implements SignalObserver {
    /**
     * Identificador numérico único inmutable asignado en construcción.
     * Facilita a las señales productoras su remoción directa en tiempo constante de $O(1)$.
     */
    public readonly id: number = nextObserverId();

    /** Nivel jerárquico topológico para el ordenamiento de ejecución síncrona libre de glitches. */
    public level: number = 0;

    private readonly _fn: EffectFn;

    /** Conjunto de productores reactivos que este efecto consume de forma activa. */
    private readonly _dependencies = new Set<Reactive<unknown>>();

    private _disposed = false;

    /**
     * Instancia un nuevo Efecto y lo registra de forma automática en el contexto raíz de control de ciclo de vida.
     * Dispara inmediatamente una primera ejecución de arranque síncrona.
     * * @param fn El callback o closure imperativo que encapsula el efecto secundario.
     */
    constructor(fn: EffectFn) {
        this._fn = fn;
        const currentScope = globalContextStack.peek();
        if (currentScope) {
            currentScope.addPrimitive(this);
        }
    }

    /**
     * Ejecuta síncronamente el callback de usuario.
     * Implementa una fase estricta de limpieza previa (`_cleanup`) que rompe todas las suscripciones actuales,
     * aislando seguidamente la ejecución al empujar el efecto a la cima de la pila reactiva global.
     * Esto asegura que las dependencias condicionales u obsoletas sean recalculadas dinámicamente en cada ciclo de vida.
     * * @complexity $O(D)$ donde $D$ es el volumen de dependencias accedidas dinámicamente en la función.
     */
    run(): void {
        if (this._disposed) return;
        this._cleanup();
        globalObserversStack.push(this);
        try {
            this._fn();
        } finally {
            globalObserversStack.pop();
        }
    }

    /**
     * Registra un nodo reactivo productor como dependencia directa del efecto.
     * Si no ha sido vinculada previamente, suscribe al efecto en la lista de difusión del productor
     * y evalúa jerárquicamente la altura topológica del efecto respecto al nivel del productor.
     * Si el nivel del productor de entrada es igual o superior al nivel actual del efecto, ajusta el nivel
     * del efecto a un nivel superior seguro $\text{dep.level} + 1$ de forma síncrona en el secuenciador.
     * * @param dep El nodo productor del cual el efecto depende directamente.
     * @complexity $O(1)$
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
        }
    }

    /**
     * Recibe una señal síncrona de invalidación de estado e instruye al Batcher global
     * para que agende su ejecución topológica en la cola síncrona de microtareas.
     */
    notify(): void {
        batcher.scheduleObserver(this);
    }

    /**
     * Desmantela el efecto reactivo cancelando todas sus dependencias de forma permanente.
     * Una vez destruido, el efecto ignora cualquier ciclo posterior de agendación y ejecución.
     */
    dispose(): void {
        this._disposed = true;
        this._cleanup();
    }

    /**
     * Ajusta el nivel topológico de ejecución del efecto síncronamente si el nuevo nivel calculado es superior.
     * * @param newLevel El nuevo nivel topológico propuesto.
     */
    public updateLevel(newLevel: number): void {
        if (newLevel > this.level) {
            const oldLevel = this.level;
            this.level = newLevel;

            if (batcher && typeof batcher.updateNodeLevel === 'function') {
                batcher.updateNodeLevel(this, oldLevel, this.level);
            }
        }
    }

    /**
     * Limpia de forma síncrona todas las suscripciones actuales y vacía el registro de dependencias.
     * Invoca de manera imperativa el método `unsubscribe` de cada una de sus dependencias en tiempo constante.
     */
    private _cleanup() {
        this._dependencies.forEach(signal => signal.unsubscribe(this));
        this._dependencies.clear();
    }
}