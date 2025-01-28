import { DOM_TYPES, VNode, VNodeElement, VNodeText } from "../../types/vdom.types";
import { destroyDOM } from "./destroy-dom";
import { mountDOM } from "./mount-dom";



function areNodesEqual(oldNode: VNode, newNode: VNode): boolean {
    if (oldNode.type !== newNode.type) return false;

    // for text nodes the value must be same:
    if (oldNode.type === DOM_TYPES.TEXT) {
        return oldNode.value === (newNode as VNodeText).value;
    }

    // for element nodes the tag must be same:
    if (oldNode.type === DOM_TYPES.ELEMENT) {
        return oldNode.tag === (newNode as VNodeElement).tag;
    }

    // fragment nodes are always equal
    return oldNode.type === DOM_TYPES.FRAGMENT;

}

function patchProps(oldProps: Record<string, unknown>, newProps: Record<string, unknown>, element: HTMLElement) {
    // Remove the attributes that are no longer present
    for (const key in oldProps) {
        if (!(key in newProps)) {
            element.removeAttribute(key);
        }
    }

    // Add or Update the new attributes
    for (const key in newProps) {
        const newValue = newProps[key];
        const oldValue = oldProps[key];
        if (newValue !== oldValue) {
            //Inside the loop over newProps, the removeAttribute is used to handle cases where a developer explicitly sets an attribute in newProps to null or undefined. This signals that the attribute should be removed from the DOM.
            if (newValue === undefined || newValue === null) element.removeAttribute(key);
            else element.setAttribute(key, newValue as string); // set the new value
        }
    }
}

function patchTextNodes(oldNode: VNodeText, newNode: VNodeText): void {
    if (oldNode.value !== newNode.value) {
        (oldNode.element as Text).nodeValue = newNode.value;
    }
    newNode.element = oldNode.element; // upate the reference
}

function patchChildren(oldNode: VNode, newNode: VNode) {
    const oldChildren = oldNode.children || [];
    const newChildren = newNode.children || [];
    const parenntEl = oldNode.element as HTMLElement;

    const oldKeyMap: Map<unknown, VNode> = new Map();

    // create a map of keys
    oldChildren.forEach((child) => {
        if (child.key) oldKeyMap.set(child.key, child);
    });

    // update the children
    newChildren.forEach((newChild) => {
        if (newChild.key != null) {
            //if the oldChild exists and has the same key, update the oldChild
            const oldChild = oldKeyMap.get(newChild.key);
            if (oldChild) {
                updateDOM(oldChild, newChild, parenntEl);
                oldKeyMap.delete(newChild.key);
            } else {
                // if the oldChild does not exist, mount the newChild
                mountDOM(newChild, parenntEl);
            }
        } else {
            // handle the unkeyed children normally as a new child
            mountDOM(newChild, parenntEl);
        }
    });

    oldKeyMap.forEach((oldChild) => { destroyDOM(oldChild) });


    // handle the remaining unkeyed children order-base
    const commonLength = Math.min(oldChildren.length, newChildren.length);
    // update the children
    for (let i = 0; i < commonLength; i++) {
        if (!newChildren[i].key) {
            updateDOM(oldChildren[i], newChildren[i], parenntEl);
        }
    }

    // Add new children if needed
    for (let i = commonLength; i < newChildren.length; i++) {
        // The new child is appended to the parent element in the function mountDOM
        if (!newChildren[i].key) {
            mountDOM(newChildren[i], parenntEl);
        }
    }

    // remove the extra children
    for (let i = commonLength; i < oldChildren.length; i++) {
        if (!oldChildren[i].key) {
            destroyDOM(oldChildren[i]);
        }
    }

}


export function updateDOM(oldNode: VNode, newNode: VNode, parentEl: HTMLElement): void {
    // if the nodes are not equal, destroy the old node and mount the new node
    if (!areNodesEqual(oldNode, newNode)) {
        // destroy the old node
        mountDOM(newNode, parentEl);
        const newElement = newNode.element as Node;
        parentEl.replaceChild(newElement, oldNode.element as Node);
        destroyDOM(oldNode);
        return;
    }

    if (oldNode.type === DOM_TYPES.TEXT && newNode.type === DOM_TYPES.TEXT) {
        patchTextNodes(oldNode, newNode);
        return;
    }

    if (oldNode.type === DOM_TYPES.ELEMENT && newNode.type === DOM_TYPES.ELEMENT) {
        patchProps((oldNode.props || {}), (newNode.props || {}), oldNode.element as HTMLElement);
        patchChildren(oldNode, newNode); // reconcile the children
    }


}