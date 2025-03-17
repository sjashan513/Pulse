export interface Reactive<T> {
    readonly value: T;
    subscribe(observer: SignalObserver): void;
    unsubscribe(observer: SignalObserver): void;
  }
  
  export interface SignalObserver {
    notify(): void;
    trackDependency(reactiveNode: Reactive<unknown>): void;
  }
  
  export type EffectFn = () => void;