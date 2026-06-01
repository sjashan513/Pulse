import { Signal } from "./signal";
import { ComputedSignal } from "./computed";
import { Effect } from "./effect";
import type { EffectFn } from "./internals/types";
import { DeepSignal, DeepSignalOptions } from "./deepSignal";
import { batcher } from "./internals/globalVariables";

/**
 * Interface representing a reactive signal.
 * Can be called as a function:
 * - With no arguments: acts as a getter and registers dependencies.
 * - With one argument: acts as a setter and updates the value.
 */
interface ISignal<T> {
  (): T;
  set: (newValue: T) => void;
}

/**
 * Interface representing a read-only computed signal.
 * Can be called as a function with no arguments to get the cached computed value.
 */
interface IComputedSignal<T> {
  (): T;
}

/**
 * Interface representing a deeply reactive signal for objects.
 * Can be called as a function to get the wrapped reactive proxy, or updated via `set`.
 */
interface IDeepSignal<T extends object> {
  (): T;
  set: (newValue: T) => void;
}

/**
 * Interface representing a writable signal, extending the basic ISignal interface.
 */
export interface WritableSignal<T> extends ISignal<T> {
  set: (newValue: T) => void;
}


/**
 * Creates a reactive writable signal.
 * 
 * @example
 * ```typescript
 * const count = signal(0);
 * console.log(count()); // Getter: 0
 * count(1);             // Setter: Updates value to 1
 * count.set(2);         // Setter: Updates value to 2
 * ```
 * 
 * @param initialValue The initial value to store in the signal.
 * @returns A callable function representing the signal getter and setter.
 */
export function signal<T>(initialValue: T): ISignal<T> {
  const instance = new Signal<T>(initialValue);
  const signal = ((...args: any[]): T | void => {
    if (args.length === 0) {
      return instance.value;
    } else {
      instance.set(args[0]);
    }
  }) as ISignal<T>;
  signal.set = (newValue: T) => instance.set(newValue);
  return signal;
}

/**
 * Creates a read-only computed signal that automatically derives its value
 * from other reactive signals and caches it.
 * 
 * @example
 * ```typescript
 * const count = signal(2);
 * const double = computed(() => count() * 2);
 * console.log(double()); // 4
 * ```
 * 
 * @param computedFn A function that returns the computed value.
 * @returns A read-only signal getter function.
 */
export function computed<T>(computedFn: () => T): IComputedSignal<T> {
  const instance = new ComputedSignal<T>(computedFn);
  const computed = (() => instance.value) as IComputedSignal<T>;
  return computed;
}

/**
 * Creates an effect that runs the provided function immediately, tracks any reactive
 * dependencies read during its execution, and re-runs the function whenever those
 * dependencies change.
 * 
 * @example
 * ```typescript
 * const count = signal(0);
 * const dispose = effect(() => {
 *   console.log("Count changed to:", count());
 * });
 * // To stop the effect:
 * dispose();
 * ```
 * 
 * @param fn The effect callback function.
 * @returns A cleanup function to dispose of the effect.
 */
export function effect(fn: EffectFn): () => void {
  const instance = new Effect(fn);
  instance.run();
  return () => instance.dispose();
}

/**
 * Creates a deeply reactive signal wrapping an object. Mutations to properties (including nested objects)
 * are tracked and trigger updates.
 * 
 * @example
 * ```typescript
 * const state = deepSignal({ user: { name: "Alice" } });
 * effect(() => {
 *   console.log("User name:", state().user.name);
 * });
 * state().user.name = "Bob"; // Triggers effect
 * ```
 * 
 * @param initialValue The initial object to wrap.
 * @param options Optional configuration (e.g. granular tracking).
 * @returns A callable function representing the deep signal.
 */
export function deepSignal<T extends object>(initialValue: T, options?: DeepSignalOptions): IDeepSignal<T> {
  const instance = new DeepSignal<T>(initialValue, options);
  const deepSignal = ((...args: any[]): T | void => {
    if (args.length === 0) {
      return instance.value;
    } else {
      instance.newValue = args[0];
    }
  }) as IDeepSignal<T>;
  deepSignal.set = (newValue: T) => instance.newValue = newValue;
  return deepSignal;
}

/**
 * Batches multiple updates together, deferring observer notification and execution
 * until the end of the batch callback function.
 * 
 * @example
 * ```typescript
 * const count = signal(0);
 * const name = signal("Alice");
 * 
 * effect(() => {
 *   console.log(count(), name());
 * });
 * 
 * batch(() => {
 *   count(1);
 *   name("Bob");
 * }); // The effect will only run once at the end of the batch callback.
 * ```
 */
export const batch = batcher.batch.bind(batcher);
