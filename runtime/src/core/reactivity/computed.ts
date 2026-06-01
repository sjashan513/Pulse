// syntra/packages/core/src/reactivity/computed.ts
import { batcher, globalContextStack, globalObserversStack } from "./internals/globalVariables";
import { Reactive, SignalObserver } from "./internals/types";

export class ComputedSignal<T> implements SignalObserver, Reactive<T> {

    private readonly _computedFn: () => T;
    private _isDirty: boolean = true;
    private _cachedValue!: T;
    private _observers = new Set<WeakRef<SignalObserver>>();
    private _dependencies = new Set<Reactive<unknown>>();

    public level: number = 0;

    constructor(computedFn: () => T) {
        this._computedFn = computedFn;
        const currentScope = globalContextStack.peek();
        if (currentScope) {
            currentScope.addPrimitive(this);
        }
    }

    get value(): T {
        if (this._isDirty) {
            this._cachedValue = this.recompute();
            this._isDirty = false;
        }
        const currentObserver = globalObserversStack.peek();
        if (currentObserver) {
            currentObserver.trackDependency(this);
        }
        return this._cachedValue;
    }

    markDirty(): void {
        if (!this._isDirty) {
            this._isDirty = true;
        }
    }

    notify(): void {
        if (!this._isDirty) {
            this._isDirty = true;
            this.notifyObservers();
        }
    }

    run(): void { }

    dispose(): void {
        this._cleanup();
        this._observers.clear();
    }

    trackDependency(dep: Reactive<unknown>): void {
        if (this._dependencies.has(dep)) return;
        this._dependencies.add(dep);
        dep.subscribe(this);

        if (dep.level >= this.level) {
            const oldLevel = this.level;
            this.level = dep.level + 1;

            // updateNodeLevel transfiere el nodo al nuevo cubo de forma segura
            if (batcher && typeof batcher.updateNodeLevel === 'function') {
                batcher.updateNodeLevel(this, oldLevel, this.level);
            }

            this.propagateLevelUpdate();
        }
    }

    // Método para propagación recursiva topológica
    public updateLevel(newLevel: number): void {
        if (newLevel > this.level) {
            const oldLevel = this.level;
            this.level = newLevel;

            if (batcher && typeof batcher.updateNodeLevel === 'function') {
                batcher.updateNodeLevel(this, oldLevel, this.level);
            }

            this.propagateLevelUpdate();
        }
    }

    private propagateLevelUpdate(): void {
        for (const ref of Array.from(this._observers)) {
            const observer = ref.deref();
            if (observer && 'updateLevel' in observer && typeof (observer as any).updateLevel === 'function') {
                (observer as any).updateLevel(this.level + 1);
            }
        }
    }

    subscribe(observer: SignalObserver): void {
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

    private recompute(): T {
        this._cleanup();
        globalObserversStack.push(this);
        let result: T;
        try {
            result = this._computedFn();
        } finally {
            globalObserversStack.pop();
        }
        return result;
    }

    private notifyObservers(): void {
        for (const ref of Array.from(this._observers)) {
            const observer = ref.deref();
            if (observer) {
                // TASK-01 (Fase I): Propagación síncrona, delegación de ejecución
                observer.notify();
            } else {
                this._observers.delete(ref);
            }
        }
    }

    private _cleanup(): void {
        this._dependencies.forEach(dep => dep.unsubscribe(this));
        this._dependencies.clear();
        // this.level = 0; // Reset topológico en limpieza, se reconstruirá dinámicamente
    }
}