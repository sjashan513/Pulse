import { globalObserversStack } from "./internals/globalVariables";
import { Reactive, SignalObserver, amortizedCleanup } from "./internals/types";

/**
 * Nodo productor hoja primario (Nivel 0) del grafo de dependencias reactivas.
 * Encapsula valores primitivos o referencias de estado y gestiona un conjunto indexado de suscriptores débiles.
 * * @remarks
 * El diseño de `Signal` utiliza un mapa indexado por el ID numérico del observador para garantizar
 * que los enlaces y desuniones se procesen en tiempo constante $O(1)$. Para evitar fugas de memoria,
 * los observadores se encapsulan en instancias de `WeakRef`.
 * * @template T Tipo del valor mutable administrado por el nodo.
 */
export class Signal<T> implements Reactive<T> {
    private _value: T;

    /**
     * Mapa interno de observadores activos indexados por su identificador único.
     * Reemplaza el almacenamiento lineal original para restaurar el rendimiento de mutación en $O(1)$.
     */
    private _observers: Map<number, WeakRef<SignalObserver>> = new Map();

    /**
     * Nivel topológico inmutable para nodos hoja del grafo. Las señales base siempre operan a nivel 0.
     */
    public readonly level: number = 0;

    /**
     * Instancia una nueva señal reactiva con un valor inicial.
     * * @param initialValue El valor de arranque para el almacenamiento reactivo.
     */
    constructor(initialValue: T) {
        this._value = initialValue;
    }

    /**
     * Obtiene el valor actual de la señal.
     * Si la lectura ocurre dentro de un contexto reactivo activo (por ejemplo, un efecto o computada),
     * el observador en la cima de la pila global registra esta señal como una dependencia directa.
     * * @returns El valor actual de tipo `T`.
     * @complexity $O(1)$
     */
    get value(): T {
        const currentObserver = globalObserversStack.peek();
        if (currentObserver) {
            currentObserver.trackDependency(this);
        }
        return this._value;
    }

    /**
     * Actualiza el valor de la señal. Si el nuevo valor es idéntico por igualdad de referencia,
     * la mutación se aborta inmediatamente sin disparar notificaciones ni agendar re-ejecuciones.
     * En caso contrario, actualiza el estado interno y difunde la notificación a todos los observadores activos.
     * * @param newValue El nuevo valor a asignar.
     * @complexity $O(1)$ ordinario; $O(N)$ al desencadenar la propagación de cambios a suscriptores.
     */
    public set(newValue: T) {
        if (this._value === newValue) return;
        this._value = newValue;
        this.notify();
    }

    /**
     * Registra un observador síncronamente en el mapa interno de difusión de la señal.
     * Encapsula al observador en un `WeakRef` para evitar referencias circulares fuertes que bloqueen al GC.
     * * @param observer El nodo consumidor que se suscribe a esta señal.
     * @complexity $O(1)$
     */
    subscribe(observer: SignalObserver): void {
        this._observers.set(observer.id, new WeakRef(observer));
    }

    /**
     * Cancela la suscripción de un observador eliminando su clave numérica inmutable del mapa.
     * No realiza iteraciones lineales ni búsquedas secuenciales, logrando un coste de ejecución constante.
     * * @param observer El nodo consumidor que se desvincula de la señal.
     * @complexity $O(1)$ estricto.
     */
    unsubscribe(observer: SignalObserver): void {
        this._observers.delete(observer.id);
    }

    /**
     * Notifica síncronamente de una alteración de estado a todos los observadores registrados.
     * * @remarks
     * Antes de realizar la iteración de mensajería, ejecuta una rutina de purga amortizada para limpiar
     * las entradas débiles muertas de observadores que ya han sido destruidos silenciosamente por el Garbage Collector.
     * Si detecta una referencia muerta durante la iteración, la elimina inmediatamente.
     * * @complexity $O(N)$ donde $N$ es la cantidad de observadores activos.
     */
    public notify() {
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
}