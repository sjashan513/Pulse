import { DOM_TYPES, VNode, VNodeElement, VNodeFragment, VNodeText } from "./types/vdom.types";

function removeTextNode(node: VNodeText): void {
    node.element?.remove();
    delete node.element; // remove the reference freeing the memory
}

function removeElementNode(node: VNodeElement): void {
    // I need to remove the children first
    node.children?.forEach((child) => destroyDOM(child));
    // remove event listeners
    if (node.props) {
        Object.entries(node.props).forEach(([key, value]) => {
            if (key.startsWith('on') && typeof value === 'function')
                node.element?.removeEventListener(key.slice(2).toLowerCase(), value as EventListener);
        });
    }
    node.element?.remove();
    delete node.element; // remove the reference freeing the memory
}

function removeFragmentNode(node: VNodeFragment): void {
    node.children?.forEach((child) => destroyDOM(child));
    // remove the childs only as the fragment itself is not a DOM node
}


export function destroyDOM(node: VNode): void {
    switch (node.type) {
        case DOM_TYPES.TEXT:
            removeTextNode(node);
            break;
        case DOM_TYPES.ELEMENT:
            removeElementNode(node);
            break;
        case DOM_TYPES.FRAGMENT:
            removeFragmentNode(node);
            break;
        default: {
            throw new Error(`Unknown node type`);
        }
    }
}