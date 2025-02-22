import { describe, expect, it, vi } from "vitest";
import { signal } from "../../../runtime/src/core/reactivity/signal";

describe("Signal()", () => {
    it("notifies subscribers on change", () => {
        const signalTest = signal(false);

        const listner = vi.fn();
        signalTest.subscribe(listner);
        signalTest.set(true);

        expect(listner).toHaveBeenCalledTimes(1);
        expect(signalTest()).toBe(true);
    })
})