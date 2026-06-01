import { Reactive, SignalObserver, amortizedCleanup } from "./internals/types";
import { batcher, globalObserversStack } from "./internals/globalVariables";

/**
 * Opciones de inicialización y parametrización para un DeepSignal.
 */
export interface DeepSignalOptions {
  /**
   * Determina si la granularidad del rastreo es a nivel de propiedad individual.
   * Si es `true`, las lecturas y mutaciones solo disparan observadores vinculados a la propiedad afectada.
   * Si es `false`, cualquier cambio en cualquier propiedad invalida todo el objeto de forma global.
   */
  granular?: boolean;
}

/**
 * Primitiva de reactividad estructural para objetos complejos y arrays anidados utilizando Proxies de JS.
 * Intercepta síncronamente operaciones de lectura (`get`) y escritura (`set`) para enlazar dependencias en el DAG.
 * * @template T Tipo del objeto o array encapsulado. Must be extends object.
 */
export class DeepSignal<T extends object> implements Reactive<T> {
  private _value: T;

  /** Mapa de observadores suscritos a cambios estructurales globales del objeto completo. */
  private _observers: Map<number, WeakRef<SignalObserver>> = new Map();

  /** Mapa asociativo que asigna a cada propiedad interceptada un sub-mapa indexado de sus observadores directos. */
  private _propertyObservers: Map<PropertyKey, Map<number, WeakRef<SignalObserver>>> = new Map();

  private _isGranular: boolean;

  /** Las señales reactivas base, incluidas las de estructura profunda, actúan como hojas de nivel 0. */
  public readonly level: number = 0;

  /** Cache de Proxies generados para prevenir duplicación y asegurar la identidad física de los objetos devueltos. */
  private _proxyCache = new WeakMap<object, object>();

  /** Mapeo invertido de Proxy a objeto sin envolver para desreferenciar operaciones y comparaciones de igualdad. */
  private _rawMap = new WeakMap<object, object>();

  /**
   * Instancia una señal reactiva profunda configurando su granularidad e interceptores Proxies.
   * * @param initialValue El objeto raíz inicial.
   * @param options Configuración del comportamiento granular del proxy.
   */
  constructor(initialValue: T, options?: DeepSignalOptions) {
    this._isGranular = options?.granular ?? false;
    this._value = this.createDeepProxy(initialValue);
  }

  /**
   * Accede al valor o proxy del objeto raíz, registrando dependencias globales.
   * * @returns El Proxy interceptor asociado al objeto raíz.
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
   * Reemplaza el objeto raíz completo por una nueva estructura.
   * Si el objeto difiere estructuralmente del actual, genera un nuevo proxy de control
   * y desencadena una notificación síncrona general en cascada a todos los observadores registrados.
   * * @param newValue El nuevo objeto estructural a mapear.
   * @complexity $O(1)$ para la envoltura; $O(U)$ al notificar dependencias donde $U$ es el volumen de observadores totales.
   */
  set newValue(newValue: T) {
    if (newValue !== this.unwrapIfProxy(this._value)) {
      this._value = this.createDeepProxy(newValue);
      this.notifyAll();
    }
  }

  /**
   * Vincula un observador al contexto de cambios estructurales globales de esta primitiva profunda.
   * * @param observer El nodo consumidor a registrar.
   * @complexity $O(1)$
   */
  subscribe(observer: SignalObserver): void {
    this._observers.set(observer.id, new WeakRef(observer));
  }

  /**
   * Desvincula síncronamente un observador.
   * Realiza la baja instantánea de la raíz y recorre los mapas de propiedades granularmente
   * para desvincular al observador en tiempo constante de desvinculación de propiedades.
   * * @param observer El nodo consumidor a desvincular.
   * @complexity $O(P)$ donde $P$ es el número de propiedades dinámicas rastreadas por la primitiva.
   */
  unsubscribe(observer: SignalObserver): void {
    // 1. Limpieza raíz instantánea en O(1)
    this._observers.delete(observer.id);

    // 2. Limpieza granular en O(1) por mapa de propiedad trackeada
    if (this._isGranular) {
      for (const map of this._propertyObservers.values()) {
        map.delete(observer.id);
      }
    }
  }

  /**
   * Notifica de cambios estructurales o generales únicamente a los suscriptores de la raíz.
   */
  public notify() {
    this.notifySet(this._observers);
  }

  /**
   * Difunde notificaciones a todos los observadores de la primitiva (Raíz y propiedades granulares).
   */
  private notifyAll() {
    this.notify();
    if (this._isGranular) {
      for (const map of this._propertyObservers.values()) {
        this.notifySet(map);
      }
    }
  }

  /**
   * Notifica síncronamente y agenda a los observadores asociados a un sub-mapa indexado.
   * Ejecuta purgas amortizadas antes del recorrido de mensajería.
   * * @param map El mapa indexado de observadores por ID.
   */
  private notifySet(map: Map<number, WeakRef<SignalObserver>>) {
    amortizedCleanup(map);

    for (const [id, ref] of map.entries()) {
      const observer = ref.deref();
      if (observer) {
        batcher.scheduleObserver(observer);
      } else {
        map.delete(id);
      }
    }
  }

  /**
   * Genera de manera recursiva e intercepta operaciones en un sub-objeto mediante Proxies.
   * Controla el rastreo de dependencias finas en lecturas y mutaciones.
   */
  private createDeepProxy<U extends object>(target: U): U {
    if (this._proxyCache.has(target)) {
      return this._proxyCache.get(target) as U;
    }

    const handler: ProxyHandler<U> = {
      get: (obj, property, receiver) => {
        const result = Reflect.get(obj, property, receiver);
        const currentObserver = globalObserversStack.peek();

        if (currentObserver) {
          // Registro básico en el observador para calcular jerarquía topológica
          currentObserver.trackDependency(this);

          if (this._isGranular) {
            this.trackPropertyDependency(property, currentObserver);
          }
        }

        if (typeof result === "object" && result !== null) {
          return this.createDeepProxy(result);
        }
        return result;
      },

      set: (obj, property, value, receiver) => {
        const oldVal = Reflect.get(obj, property, receiver);
        const newVal = typeof value === "object" && value !== null
          ? this.createDeepProxy(value)
          : value;

        const success = Reflect.set(obj, property, newVal, receiver);
        const unwrappedOld = this.unwrapIfProxy(oldVal);
        const unwrappedNew = this.unwrapIfProxy(newVal);

        if (success && unwrappedOld !== unwrappedNew) {
          if (this._isGranular) {
            const propObservers = this._propertyObservers.get(property);
            if (propObservers) {
              this.notifySet(propObservers);
            }
            this.notify();
          } else {
            this.notify();
          }
        }
        return success;
      },
    };

    const proxy = new Proxy<U>(target, handler);
    this._proxyCache.set(target, proxy);
    this._rawMap.set(proxy, target);
    return proxy;
  }

  /**
   * Enlaza síncronamente un observador con una clave/propiedad específica del objeto.
   * * @remarks
   * Al mapear directamente la identidad del observador mediante `map.set(observer.id, ...)`,
   * se anula por completo la necesidad de realizar recorridos lineales costosos de desduplicación,
   * reduciendo el coste de enlazado de propiedades a tiempo constante $O(1)$.
   * * @param property La propiedad o clave léxica del objeto que está siendo observada.
   * @param observer El consumidor reactivo interesado en la clave.
   * @complexity $O(1)$
   */
  private trackPropertyDependency(property: PropertyKey, observer: SignalObserver) {
    let map = this._propertyObservers.get(property);
    if (!map) {
      map = new Map();
      this._propertyObservers.set(property, map);
    }
    map.set(observer.id, new WeakRef(observer));
  }

  /**
   * Devuelve la referencia del objeto JS nativo subyacente si el valor provisto es un proxy controlado.
   */
  private unwrapIfProxy(value: unknown): unknown {
    if (this._rawMap.has(value as object)) {
      return this._rawMap.get(value as object);
    }
    return value;
  }
}