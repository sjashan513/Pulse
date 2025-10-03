export interface Reactive<T> {
  readonly value: T;
  readonly level: number;
  subscribe(observer: SignalObserver): void;
  unsubscribe(observer: SignalObserver): void;
}

export interface SignalObserver {
  readonly level: number;
  notify(): void;
  run(): void;
  trackDependency(reactiveNode: Reactive<unknown>): void;
}

export type EffectFn = () => void;