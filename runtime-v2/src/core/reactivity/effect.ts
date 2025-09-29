import { globalObserversStack } from "./internals/globalVariables";
import { EffectFn, Reactive, SignalObserver } from "./internals/types";


export class Effect implements SignalObserver{
    private readonly _fn:EffectFn;
    private readonly _dependencies = new Set<Reactive<unknown>>();
    private _disposed  =false;
    constructor(fn:EffectFn){
        this._fn = fn;
    }

    run():void{
        if(this._disposed) return;
        this._cleanup();
        globalObserversStack.push(this);
        this._fn();
        globalObserversStack.pop();   
    }

    trackDependency(dep: Reactive<unknown>): void {
        this._dependencies.add(dep);
        dep.subscribe(this);
    }
    notify(): void {
        this.run();
    }

    dispose():void{
        this._disposed = true;
        this._cleanup();
    }

    private _cleanup(){
        this._dependencies.forEach(signal => signal.unsubscribe(this));
    }
}