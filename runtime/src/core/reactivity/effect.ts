import { batcher, globalContextStack, globalObserversStack } from "./internals/globalVariables";
import { EffectFn, Reactive, SignalObserver } from "./internals/types";


export class Effect implements SignalObserver {
    public level: number = 0;
    private readonly _fn: EffectFn;
    private readonly _dependencies = new Set<Reactive<unknown>>();
    private _disposed = false;

    constructor(fn: EffectFn) {
        this._fn = fn;
        const currentScope = globalContextStack.peek();
        if (currentScope) {
            currentScope.addPrimitive(this);
        }
    }

    run(): void {
        if (this._disposed) return;
        this._cleanup();
        globalObserversStack.push(this);
        this._fn();
        globalObserversStack.pop();
        this._recalculateLevel();
    }

    trackDependency(dep: Reactive<unknown>): void {
        this._dependencies.add(dep);
        dep.subscribe(this);
    }
    notify(): void {
        batcher.scheduleObserver(this);
    }

    dispose(): void {
        this._disposed = true;
        this._cleanup();
    }

    private _cleanup() {
        this._dependencies.forEach(signal => signal.unsubscribe(this));
    }

    private _recalculateLevel() {
        if (this._dependencies.size === 0) {
            this.level = 1;
            return;
        }
        let maxLevel = 0;
        this._dependencies.forEach(dep => {
            if (dep.level > maxLevel) {
                maxLevel = dep.level;
            }
        });
        this.level = maxLevel + 1;

    }
}