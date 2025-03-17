import { batcher } from "./globalVariables";
import { SignalObserver } from "./types";

type SignalBinding = {
    signal: string;
    operation: 'setText' | 'setAttribute' | 'toggleVisibility' | 'setEvent';
    target: string; // DOM node identifier
    prefix?: string;
    suffix?: string;
    attribute?: string;
    event?: string;
  };
  
  class SignalGraph {
    private bindings: Map<string, SignalBinding[]> = new Map(); // signalName -> bindings
    private observers: Map<string, Set<WeakRef<SignalObserver>>> = new Map(); // signalName -> observers
  
    addBinding(signal: string, binding: SignalBinding) {
      if (!this.bindings.has(signal)) {
        this.bindings.set(signal, []);
      }
      this.bindings.get(signal)!.push(binding);
    }
  
    subscribe(signal: string, observer: SignalObserver) {
      if (!this.observers.has(signal)) {
        this.observers.set(signal, new Set());
      }
      this.observers.get(signal)!.add(new WeakRef(observer));
    }
  
    notify(signal: string) {
      const observersToNotify = this.observers.get(signal);
      if (observersToNotify) {
        observersToNotify.forEach(ref => {
          const observer = ref.deref();
          if (observer) {
            batcher.scheduleObserver(observer);
          } else {
            this.observers.get(signal)!.delete(ref);
          }
        });
      }
    }
  
    getBindings(signal: string): SignalBinding[] {
      return this.bindings.get(signal) || [];
    }
  }
  
  export const signalGraph = new SignalGraph();