import { Reactive, SignalObserver } from "./internals/types";
import { batcher, globalObserversStack } from "./internals/globalVariables";

export interface DeepSignalOptions {
  granular?: boolean;
}

export class DeepSignal<T extends object> implements Reactive<T> {
  private _value: T;

  // Modo Estándar: Un set para todo el objeto
  private _observers: Set<WeakRef<SignalObserver>> = new Set();

  // Modo Granular: Un mapa de Propiedad -> Set de Observadores
  private _propertyObservers: Map<PropertyKey, Set<WeakRef<SignalObserver>>> = new Map();

  private _isGranular: boolean;
  public readonly level: number = 0; // Signals base son nivel 0

  // Maps raw objects -> proxies
  private _proxyCache = new WeakMap<object, object>();
  // Maps proxies -> raw objects
  private _rawMap = new WeakMap<object, object>();

  constructor(initialValue: T, options?: DeepSignalOptions) {
    this._isGranular = options?.granular ?? false;
    this._value = this.createDeepProxy(initialValue);
  }

  get value(): T {
    // Si alguien accede a la señal "entera" (ej: console.log(state())), 
    // siempre suscribimos al observador global, sea granular o no.
    const currentObserver = globalObserversStack.peek();
    if (currentObserver) {
      currentObserver.trackDependency(this);
      // NOTA: En modo granular, acceder al objeto raíz sigue siendo una dependencia "global"
      // sobre la referencia del objeto.
    }
    return this._value;
  }

  set newValue(newValue: T) {
    if (newValue !== this.unwrapIfProxy(this._value)) {
      this._value = this.createDeepProxy(newValue);
      // Si cambia la raíz, notificamos a TODO EL MUNDO (propiedades y global)
      this.notifyAll();
    }
  }

  // Método requerido por la interfaz Reactive, usado para suscripciones globales
  subscribe(observer: SignalObserver): void {
    this._observers.add(new WeakRef(observer));
  }

  unsubscribe(observer: SignalObserver): void {
    // Limpieza global
    this.removeObserverFromSet(this._observers, observer);

    // Limpieza granular (si existe)
    if (this._isGranular) {
      for (const set of this._propertyObservers.values()) {
        this.removeObserverFromSet(set, observer);
      }
    }
  }

  // Notifica a los observadores globales (usado cuando cambia la estructura o en modo no-granular)
  public notify() {
    this.notifySet(this._observers);
  }

  // Notifica absolutamente a todos (Root + Propiedades)
  private notifyAll() {
    this.notify(); // Globales
    if (this._isGranular) {
      for (const set of this._propertyObservers.values()) {
        this.notifySet(set);
      }
    }
  }

  private notifySet(set: Set<WeakRef<SignalObserver>>) {
    const observersToNotify = Array.from(set);
    observersToNotify.forEach((ref) => {
      const observer = ref.deref();
      if (observer) {
        batcher.scheduleObserver(observer);
      } else {
        set.delete(ref);
      }
    });
  }

  private removeObserverFromSet(set: Set<WeakRef<SignalObserver>>, observer: SignalObserver) {
    for (const ref of set) {
      if (ref.deref() === observer) {
        set.delete(ref);
        break;
      }
    }
  }

  private createDeepProxy<U extends object>(target: U): U {
    if (this._proxyCache.has(target)) {
      return this._proxyCache.get(target) as U;
    }

    const handler: ProxyHandler<U> = {
      get: (obj, property, receiver) => {
        const result = Reflect.get(obj, property, receiver);
        const currentObserver = globalObserversStack.peek();

        if (currentObserver) {
          // 1. REGISTRO DE DEPENDENCIAS
          // Siempre avisamos al observador que depende de ESTE nodo reactivo (DeepSignal)
          // para que pueda calcular su 'level' y gestionar su ciclo de vida.
          currentObserver.trackDependency(this);

          // 2. SUSCRIPCIÓN FINA (Si es Granular)
          if (this._isGranular) {
            this.trackPropertyDependency(property, currentObserver);
          } else {
            // Si no es granular, se suscribe al conjunto global a través de 'subscribe' 
            // que llama trackDependency automáticamente al invocarlo arriba, 
            // pero aseguramos la suscripción interna aquí si fuera necesario.
            // (Nota: trackDependency llama a this.subscribe, así que ya está cubierto).
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
          // 3. NOTIFICACIÓN
          if (this._isGranular) {
            // A. Notificar a quienes escuchan ESTA propiedad específica
            const propObservers = this._propertyObservers.get(property);
            if (propObservers) {
              this.notifySet(propObservers);
            }
            // B. Notificar a quienes escuchan el objeto entero (siempre necesario)
            this.notify();
          } else {
            // Modo Simple: Notificar a todos
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

  private trackPropertyDependency(property: PropertyKey, observer: SignalObserver) {
    let set = this._propertyObservers.get(property);
    if (!set) {
      set = new Set();
      this._propertyObservers.set(property, set);
    }
    // Evitar duplicados (aunque WeakRef lo hace difícil de comprobar por igualdad estricta de ref,
    // iteramos para ver si el objeto subyacente ya está).
    let exists = false;
    for (const ref of set) {
      if (ref.deref() === observer) {
        exists = true;
        break;
      }
    }
    if (!exists) {
      set.add(new WeakRef(observer));
    }
  }

  private unwrapIfProxy(value: unknown): unknown {
    if (this._rawMap.has(value as object)) {
      return this._rawMap.get(value as object);
    }
    return value;
  }
}