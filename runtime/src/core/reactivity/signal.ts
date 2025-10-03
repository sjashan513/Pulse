import { globalObserversStack, batcher } from "./internals/globalVariables";
import { Reactive, SignalObserver } from "./internals/types";


export class Signal<T> implements Reactive<T> {
    private _value: T;
    private _observers: Set<WeakRef<SignalObserver>> = new Set();
    public readonly level: number = 0;

    constructor(initialValue: T) {
        this._value = initialValue;
    }


    get value(): T {
        const currentObserver = globalObserversStack.peek();
        if (currentObserver) {
            currentObserver.trackDependency(this);

        }
        return this._value;
    }

    public set(newValue: T) {
        if (this._value === newValue) return;
        this._value = newValue;
        this.notify();
    }

    subscribe(observer: SignalObserver): void {

        this._observers.add(new WeakRef(observer));
    }

    unsubscribe(observer: SignalObserver): void {
        const refToRemove = Array.from(this._observers).find(ref => ref.deref() === observer);
        if (refToRemove) {
            this._observers.delete(refToRemove);
        }
    }

    public notify() {
        // Notify all observers
        const observersToNotify = Array.from(this._observers);
        observersToNotify.forEach(ref => {
            const observer = ref.deref();
            if (observer) {
                batcher.scheduleObserver(observer);
            } else {
                this._observers.delete(ref);
            }
        });
    }
}