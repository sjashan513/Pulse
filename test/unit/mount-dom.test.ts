import { h, hFragment, hString } from "../../runtime/src/core/vdom/h";
import { mountDOM } from "../../runtime/src/core/vdom/mount-dom";
import { vi } from "vitest";

describe('mountDom -> Text Node', () => {
    it('should create a text node and append it to the parent', () => {
        const parent = document.createElement('div');
        const node = hString('Hello World');

        mountDOM(node, parent);
        expect(parent.textContent).toBe("Hello World");
        expect(node.element).toBeInstanceOf(Text);

    })
})

describe("mountDOM - Element Node", () => {
    it("should mount an element node with attributes", () => {
        const parent = document.createElement("div");
        const vnode = h("button", { id: "btn", class: "primary" }, []);

        mountDOM(vnode, parent);

        const button = parent.querySelector("#btn");
        expect(button).toBeTruthy();
        expect(button?.tagName).toBe("BUTTON");
        expect(button?.className).toBe("primary");
    });
});

describe("mountDOM - Event Listeners", () => {
    it("should attach event listeners to an element", () => {
        const parent = document.createElement("div");
        const onClick = vi.fn();
        const vnode = h("button", { onClick }, []);

        mountDOM(vnode, parent);

        const button = parent.querySelector("button");
        expect(button).toBeTruthy();

        // Simulate a click event
        button?.click();
        expect(onClick).toHaveBeenCalledTimes(1);
        ;
    });
});


describe("mountDOM - Nested Children", () => {
    it("should mount nested children correctly", () => {
        const parent = document.createElement("div");
        const vnode = h("div", {}, [
            h("h1", {}, [hString("Hello")]),
            h("p", {}, [hString("World!")]),
        ]);

        mountDOM(vnode, parent);

        expect(parent.querySelector("h1")?.textContent).toBe("Hello");
        expect(parent.querySelector("p")?.textContent).toBe("World!");
    });
});

describe("mountDOM - Fragments", () => {
    it("should mount a fragment without creating a wrapper", () => {
        const parent = document.createElement("div");
        const vnode = hFragment([
            h("h1", {}, [hString("Title")]),
            h("p", {}, [hString("This is a paragraph.")]),
        ]);

        mountDOM(vnode, parent);

        expect(parent.children.length).toBe(2);
        expect(parent.querySelector("h1")?.textContent).toBe("Title");
        expect(parent.querySelector("p")?.textContent).toBe("This is a paragraph.");
    });
});


describe("mountDOM - Complex Tree", () => {
    it("should mount a complex VDOM tree", () => {
        const parent = document.createElement("div");
        const vnode = h("div", { id: "app" }, [
            h("header", {}, [hString("Header Content")]),
            hFragment([
                h("section", { class: "content" }, [
                    h("p", {}, [hString("Paragraph 1")]),
                    h("p", {}, [hString("Paragraph 2")]),
                ]),
                h("footer", {}, [hString("Footer Content")]),
            ]),
        ]);

        mountDOM(vnode, parent);

        expect(parent.querySelector("#app")).toBeTruthy();
        expect(parent.querySelector("header")?.textContent).toBe("Header Content");
        expect(parent.querySelector("footer")?.textContent).toBe("Footer Content");
        expect(parent.querySelectorAll("p").length).toBe(2);
    });
});


describe("mountDOM - Empty Fragment", () => {
    it("should handle an empty fragment without errors", () => {
        const parent = document.createElement("div");
        const vnode = hFragment([]);

        mountDOM(vnode, parent);

        expect(parent.children.length).toBe(0);
    });
});