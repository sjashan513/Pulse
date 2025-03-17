import { globalObserversStack } from "./internals/globalVariables";
import { Reactive, SignalObserver } from "./internals/types";

export class ComputedSignal<T> implements SignalObserver, Reactive<T> {
    
    private readonly _computedFn:() => T;
    private _isDirty:boolean = true;
    private _cachedValue!:T;
    private  _observers = new Set<WeakRef<SignalObserver>>();
    private _dependencies = new Set<Reactive<unknown>>();

    constructor(computedFn:() => T){
        this._computedFn = computedFn;
    }
    

    get value():T{
        if(this._isDirty){
            this._cachedValue = this.recompute();
            this._isDirty = false;
        }
        const currentObserver = globalObserversStack.peek();
        if(currentObserver){
            currentObserver.trackDependency(this);
        }
        return this._cachedValue;
    }
    

    markDirty():void{
        if(!this._isDirty){
            this._isDirty = true;
        }
    }

    notify(): void {
        if(!this._isDirty){
            this._isDirty = true;
            this.notifyObservers();
        }
    }
    trackDependency(dep: Reactive<unknown>): void {
        if(this._dependencies.has(dep)) return;
        this._dependencies.add(dep);
        dep.subscribe(this);
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

    private recompute():T{
        this._cleanup();
        globalObserversStack.push(this);
        let result:T;
        try{
            result = this._computedFn();
        }finally{
            globalObserversStack.pop();
        }
        return result;
    }
    private notifyObservers(): void {
        for (const ref of Array.from(this._observers)) {
          const observer = ref.deref();
          if (observer) {
            observer.notify();
          } else {
            this._observers.delete(ref);
          }
        }
      }
    private _cleanup():void{
        this._dependencies.forEach(dep => dep.unsubscribe(this));
        this._dependencies.clear();
    }
}