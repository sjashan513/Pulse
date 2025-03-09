import { Signal } from "./signal";
import { ComputedSignal } from "./computed";
import { Effect } from "./effect";
import type { EffectFn } from "./internals/types";
import { DeepSignal } from "./deepSignal";

interface ISignal<T> {
  (): T;
  set: (newValue: T) => void;
}

interface IComputedSignal<T> {
  (): T;
}

interface IDeepSignal<T extends object> {
  (): T;
  set: (newValue: T) => void;
}

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

export function computed<T>(computedFn: () => T): IComputedSignal<T> {
  const instance = new ComputedSignal<T>(computedFn);
  const computed = (() => instance.value) as IComputedSignal<T>;
  return computed;
}

export function effect(fn: EffectFn): () => void {
  const instance = new Effect(fn);
  instance.run();
  return () => instance.dispose();
}

export function deepSignal<T extends object>(initialValue: T): IDeepSignal<T> {
  const instance = new DeepSignal<T>(initialValue);
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
