
export enum DOM_TYPES {
    TEXT = 'text',
    ELEMENT = 'element',
    FRAGMENT = 'fragment',
}
export interface DefaultVNode {
    type: DOM_TYPES;
    tag?: string;
    props?: Record<string, unknown>;
    children?: VNode[];
    element?: HTMLElement | Text | null;
}

export interface VNodeText extends DefaultVNode {
    type: DOM_TYPES.TEXT;
    value: string;
    tag?: never; // prevent tag from being used in text nodes
}

export interface VNodeElement extends DefaultVNode {
    type: DOM_TYPES.ELEMENT;
    tag: string;
    props?: Record<string, unknown>;
    children?: VNode[];
}

export interface VNodeFragment extends DefaultVNode {
    type: DOM_TYPES.FRAGMENT;
    children: VNode[];
    tag?: never; // prevent tag from being used in fragment nodes
}

export type VNode = VNodeElement | VNodeText | VNodeFragment;