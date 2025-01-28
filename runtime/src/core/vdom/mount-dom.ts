import { DOM_TYPES, VNode, VNodeElement, VNodeFragment, VNodeText } from "../../types/vdom.types";


function createTextNode(node: VNodeText, parent: HTMLElement): void {
    const textNode = document.createTextNode(node.value);
    node.element = textNode;
    parent.appendChild(textNode);
}

function createFragmentNode(node: VNodeFragment, parent: HTMLElement): void {
    node.element = parent;
    node.children?.forEach((child) => {
        mountDOM(child, parent);
    });
}

function createElementNode(node: VNodeElement, parent: HTMLElement): void {
    const element = document.createElement(node.tag);
    // save the element reference
    node.element = element;
    // set the props ...
    setProps(element, node.props || {});
    // set the children recursively
    node.children?.forEach((child) => mountDOM(child, element));
    // append the element to the parent
    parent.appendChild(element);

}

function setProps(element: HTMLElement, props: Record<string, unknown>): void {
    Object.entries(props).forEach(([key, value]) => {
        if (key.startsWith("on") && typeof value === 'function') {
            element.addEventListener(key.slice(2).toLowerCase(), value as EventListener);
        } else {
            element.setAttribute(key, value as string);
        }
    });
}
export function mountDOM(node: VNode, parent: HTMLElement): void {
    switch (node.type) {
        case DOM_TYPES.TEXT:
            createTextNode(node, parent);
            break;
        case DOM_TYPES.ELEMENT:
            createElementNode(node, parent);
            break;
        case DOM_TYPES.FRAGMENT:
            createFragmentNode(node, parent);
            break;
    }
}