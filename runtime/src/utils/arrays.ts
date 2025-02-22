import { hString } from "../core/vdom/h";
import { VNode } from "../core/vdom/types/vdom.types";

export function withoutNull<T>(childrens: (T | null | undefined)[]): T[] {
    return childrens.filter((child): child is T => child != null); // Remove null or undefined children
}

export function mapTextNodes(children: (VNode | string)[]): VNode[] {
    return children.map((child) => {
        return typeof child === 'string' ? hString(child) : child;
    });
}

