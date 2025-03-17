/**
 * A generic, type-safe stack implementation using an underlying array.
 *
 * This class implements a Last-In-First-Out (LIFO) data structure.
 * It provides methods to push, pop, and peek at elements, along with
 * utility functions to check if the stack is empty, determine its size,
 * and clear all its contents.
 *
 * @template T - The type of elements stored in the stack.
 */
export class Stack<T> {
    private stackArr: T[] = [];

    /**
     * Pushes a value onto the top of the stack.
     *
     * @param value - The value to be added to the stack.
     */
    public push(value: T): void {
        this.stackArr.push(value);
    }

    /**
     * Removes and returns the top element from the stack.
     *
     * @returns The element at the top of the stack.
     * @throws {Error} When attempting to pop from an empty stack.
     */
    public pop(): T {
        if (this.isEmpty()) {
            throw new Error("Stack is empty");
        }
        return this.stackArr.pop() as T;
    }

    /**
     * Returns the top element of the stack without removing it.
     *
     * @returns The element at the top of the stack.
     * @throws {Error} When attempting to peek into an empty stack.
     */
    public peek(): T | undefined {
        if (this.isEmpty()) {
            return undefined;
        }
        return this.stackArr[this.stackArr.length - 1];
    }

    /**
     * Checks whether the stack is empty.
     *
     * @returns True if the stack contains no elements; otherwise, false.
     */
    public isEmpty(): boolean {
        return this.stackArr.length === 0;
    }

    /**
     * Returns the number of elements currently in the stack.
     *
     * @returns The size of the stack.
     */
    public size(): number {
        return this.stackArr.length;
    }

    /**
     * Clears all elements from the stack.
     *
     * Resets the stack to its initial, empty state.
     */
    public clear(): void {
        this.stackArr = [];
    }
}
