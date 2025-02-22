import { Signal } from "./signal";
import { ComputedSignal } from "./computed";
import { Effect } from "./effect";
import type { EffectFn } from "./internals/types";

interface ISignal<T> {
  get: () => T;
  set: (newValue: T) => void;
}

interface IComputedSignal<T> {
  get: () => T;
}

export function signal<T>(initialValue: T): ISignal<T> {
  const instance = new Signal<T>(initialValue);
  return {
    get: () => instance.value,
    set: (newValue: T) => instance.set(newValue),
  };
}

export function computed<T>(computedFn: () => T): IComputedSignal<T> {
  const instance = new ComputedSignal<T>(computedFn);
  return {
    get: () => instance.value,
  };
}

export function effect(fn: EffectFn): () => void {
  const instance = new Effect(fn);
  instance.run();
  return () => instance.dispose();
}
