import { globalObserversStack } from "./globalVariables";

/**
 * Executes a function without tracking any dependencies that are read inside it.
 *
 * This is useful when you need to read a signal's value inside an effect
 * but do not want the effect to re-run when that specific signal changes.
 *
 * @param fn The function to execute without tracking.
 * @returns The value returned by the function.
 */
export function untrack<T>(fn: () => T): T {
    // If the stack is already empty, there's nothing to do.
    if (globalObserversStack.isEmpty()) {
        return fn();
    }

    // 1. Save the entire current stack of observers.
    const previousObservers = globalObserversStack.getItems();

    // 2. Completely clear the global stack, making the system "blind".
    globalObserversStack.clear();

    try {
        // 3. Execute the user's function. Any signal read inside will see an empty stack.
        return fn();
    } finally {
        // 4. Restore the original stack, no matter what.
        globalObserversStack.replace(previousObservers);
    }
}

