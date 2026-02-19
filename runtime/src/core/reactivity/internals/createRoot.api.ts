import { globalContextStack } from "./globalVariables";
import { Root } from "./root";

/**
 * Creates a new reactive scope. Any reactive primitives (Effect, Computed)
 * created within the callback function will be automatically registered to this
 * scope.
 *
 * @param fn The function to execute within the new reactive scope. It receives
 * a `dispose` function as its only argument, which can be called to tear down
 * the entire scope and all its primitives at once.
 */
export function createRoot(fn: (dispose: () => void) => void): void {
    const newRoot = new Root();
    const previousRoot = globalContextStack.peek();

    globalContextStack.push(newRoot);

    const dispose = () => {
        newRoot.dispose();
    };

    try {
        fn(dispose);
    } finally {
        // Guarantee that we restore the previous root, even if the user's
        // code throws an error.
        if (globalContextStack.peek() === newRoot) {
            globalContextStack.pop();
        } else if (previousRoot) {
            // This is a safety net for complex nesting scenarios. If the stack
            // was modified incorrectly, we restore to the last known good state.
            while (globalContextStack.peek() !== previousRoot) {
                globalContextStack.pop();
            }
        }
    }
}

