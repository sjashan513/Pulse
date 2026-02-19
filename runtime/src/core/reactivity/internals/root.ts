import { Container, SignalObserver } from "./types";



export class Root implements Container {
    private _primitives = new Set<WeakRef<SignalObserver>>();

    addPrimitive(primitive: SignalObserver): void {
        this._primitives.add(new WeakRef(primitive));
    }
    dispose(): void {
        this._primitives.forEach(ref => {
            const primitive = ref.deref();
            if (primitive) {
                primitive.dispose();
            }
        });
        this._primitives.clear();
    }
}