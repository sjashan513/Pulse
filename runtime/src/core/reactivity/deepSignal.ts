import { Reactive, SignalObserver } from "./internals/types";
import { batcher, globalObserversStack } from "./internals/globalVariables";

export class DeepSignal<T extends object> implements Reactive<T> {
  private _value: T;
  private _observers: Set<WeakRef<SignalObserver>> = new Set();

  // Maps raw objects -> proxies
  private _proxyCache = new WeakMap<object, object>();
  // Maps proxies -> raw objects
  private _rawMap = new WeakMap<object, object>();

  constructor(initialValue: T) {
    this._value = this.createDeepProxy(initialValue);
  }

  get value(): T {
    return this._value;
  }

  set newValue(newValue: T) {
    // If the user sets a completely new root object
    if (newValue !== this.unwrapIfProxy(this._value)) {
      this._value = this.createDeepProxy(newValue);
      this.notify();
    }
  }

  subscribe(observer: SignalObserver): void {
    for(const ref of this._observers){
      if(ref.deref() === observer){
          return;
      }
  }
    this._observers.add(new WeakRef(observer));
  }

  unsubscribe(observer: SignalObserver): void {
    for (const ref of this._observers) {
      if (ref.deref() === observer) {
        this._observers.delete(ref);
        break;
      }
    }
  }

  public notify() {
    // Notify any still-alive observers
    const observersToNotify = Array.from(this._observers);
    observersToNotify.forEach((ref) => {
      const observer = ref.deref();
      if (observer) {
        batcher.scheduleObserver(observer);
      } else {
        this._observers.delete(ref);
      }
    });
  }

  private createDeepProxy<U extends object>(target: U): U {
    // Already have a proxy for this object? Return it
    if (this._proxyCache.has(target)) {
      return this._proxyCache.get(target) as U;
    }

    const handler: ProxyHandler<U> = {
      get: (obj, property, receiver) => {
        const result = Reflect.get(obj, property, receiver);

        // Track dependencies if an effect is running
        const currentObserver = globalObserversStack.peek();
        if (currentObserver) {
          currentObserver.trackDependency(this);
        }

        // Recursively wrap nested objects
        if (typeof result === "object" && result !== null) {
          return this.createDeepProxy(result);
        }
        return result;
      },

      set: (obj, property, value, receiver) => {
        // Grab the old value
        const oldVal = Reflect.get(obj, property, receiver);

        // If new value is an object, wrap it in a proxy
        const newVal =
          typeof value === "object" && value !== null
            ? this.createDeepProxy(value)
            : value;

        // Perform the actual set
        const success = Reflect.set(obj, property, newVal, receiver);

        // Unwrap both sides so they can be compared as raw references
        const unwrappedOld = this.unwrapIfProxy(oldVal);
        const unwrappedNew = this.unwrapIfProxy(newVal);

        // Only notify if the underlying references are truly different
        if (success && unwrappedOld !== unwrappedNew) {
          this.notify();
        }

        return success;
      },
    };

    // Create a proxy and store it in both caches
    const proxy = new Proxy<U>(target, handler);
    this._proxyCache.set(target, proxy);
    this._rawMap.set(proxy, target);

    return proxy;
  }

  private unwrapIfProxy(value: unknown): unknown {
    // If it's a proxy we created, return the original object
    if (this._rawMap.has(value as object)) {
      return this._rawMap.get(value as object);
    }
    return value;
  }
}
