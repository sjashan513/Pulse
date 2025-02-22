import { DOM_TYPES, VNode, VNodeElement, VNodeText } from "./types/vdom.types";
import { destroyDOM } from "./destroy-dom";
import { mountDOM } from "./mount-dom";



export function areNodesEqual(oldNode: VNode, newNode: VNode): boolean {
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
    const usedOldChildren: boolean[] = new Array(oldChildren.length).fill(false);

    // create a map of keys
    oldChildren.forEach((child) => {
        if (child && child.props?.key) oldKeyMap.set(child.props.key, child);
    });

    // iterate through the new children to reconcile
    newChildren.forEach((newChild) => {
        const newKey = newChild.props?.key;
        let oldChild: VNode | undefined;
        if (newKey) {
            //
            oldChild = oldKeyMap.get(newKey);
            if (oldChild) {
                oldKeyMap.delete(newKey);
                usedOldChildren[oldChildren.indexOf(oldChild)] = true;
            }
        } else {
            for (let oldIndex = 0; oldIndex < oldChildren.length; oldIndex++) {
                if (!usedOldChildren[oldIndex] && !oldChildren[oldIndex].props?.key) {
                    const candidate = oldChildren[oldIndex];
                    if (areNodesEqual(candidate, newChild)) {
                        oldChild = candidate;
                        usedOldChildren[oldIndex] = true;
                        break;
                    }
                }
            }
        }
        if (oldChild) {
            // if the oldChild exists, update the oldChild
            updateDOM(oldChild, newChild, parenntEl);
        } else {
            // if the oldChild does not exist, mount the newChild
            mountDOM(newChild, parenntEl);
        }
    });

    usedOldChildren.forEach((used, index) => {
        if (!used) {
            // destroy the unused children
            destroyDOM(oldChildren[index]);
        }
    });
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