// syntra/packages/core/src/reactivity/effect.ts
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
        try {
            this._fn();
        } finally {
            globalObserversStack.pop();
        }
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
        }
    }

    notify(): void {
        batcher.scheduleObserver(this);
    }

    dispose(): void {
        this._disposed = true;
        this._cleanup();
    }

    // Método para propagación recursiva topológica
    public updateLevel(newLevel: number): void {
        if (newLevel > this.level) {
            const oldLevel = this.level;
            this.level = newLevel;

            if (batcher && typeof batcher.updateNodeLevel === 'function') {
                batcher.updateNodeLevel(this, oldLevel, this.level);
            }
        }
    }

    private _cleanup() {
        this._dependencies.forEach(signal => signal.unsubscribe(this));
        this._dependencies.clear();
        // this.level = 0; // Reset topológico en limpieza
    }
}