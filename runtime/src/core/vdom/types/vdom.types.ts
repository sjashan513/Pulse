/**
 * Enum representing the different types of DOM nodes.
 */
export enum DOM_TYPES {
    /** Represents a text node. */
    TEXT = 'text',

    /** Represents an element node (e.g., <div>, <span>). */
    ELEMENT = 'element',

    /** Represents a fragment node, used to group multiple children without adding extra DOM elements. */
    FRAGMENT = 'fragment',
}

/**
 * Base interface for all Virtual DOM nodes.
 */
export interface DefaultVNode {
    /** The type of the DOM node, as defined in DOM_TYPES. */
    type: DOM_TYPES;

    /**
     * The tag name for element nodes (e.g., 'div', 'span').
     * Undefined for non-element nodes.
     */
    tag?: string;

    /**
     * A record of properties/attributes associated with the node.
     * The keys are property names and the values are their corresponding values.
     */
    props?: PropsType;

    /**
     * An array of child nodes. Can include VNodes or primitive types.
     */
    children?: VNodeChildren[];

    /**
     * Reference to the actual DOM element or Text node.
     * Useful for directly manipulating the DOM after rendering.
     */
    element?: HTMLElement | Text | null;

    /**
     * A unique key to identify the node among its siblings.
     * Useful for optimizing rendering and reconciliation processes.
     */
    key?: unknown;
}

/**
 * Interface representing a text Virtual DOM node.
 * Text nodes cannot have children or tags.
 */
export interface VNodeText extends DefaultVNode {
    /** Specifies that this node is a text node. */
    type: DOM_TYPES.TEXT;

    /** The textual content of the node. */
    value: string;

    /** Tag is never defined for text nodes. */
    tag?: never;

    /** Text nodes cannot have children. */
    children?: never; // 🚫 Explicitly forbidden
}

/**
 * Interface representing an element Virtual DOM node.
 * Element nodes must have a tag and can have children.
 */
export interface VNodeElement extends DefaultVNode {
    /** Specifies that this node is an element node. */
    type: DOM_TYPES.ELEMENT;

    /** The tag name of the element (e.g., 'div', 'span'). */
    tag: string;

    /** An array of child Virtual DOM nodes. */
    children?: VNode[];
}

/**
 * Interface representing a fragment Virtual DOM node.
 * Fragments are used to group multiple children without adding extra DOM elements.
 */
export interface VNodeFragment extends DefaultVNode {
    /** Specifies that this node is a fragment node. */
    type: DOM_TYPES.FRAGMENT;

    /** An array of child Virtual DOM nodes. Fragments must have children. */
    children: VNode[]; // ✅ Always required

    /** Tag is never defined for fragment nodes. */
    tag?: never;
}

export type PropsType = Record<string, unknown>;

/**
 * Union type representing any valid Virtual DOM node.
 */
export type VNode = VNodeElement | VNodeText | VNodeFragment;

/**
 * Type representing the possible children of a Virtual DOM node.
 * Can be primitive types, VNodes, or nested arrays of VNodeChildren.
 */
export type VNodeChildren =
    | string
    | number
    | boolean
    | VNode
    | null
    | undefined
    | readonly VNodeChildren[]; // 🔥 Supports nested arrays

/**
 * Type guard to determine if a given node is a Fragment.
 *
 * @param node - The node to check.
 * @returns True if the node is a VNodeFragment, otherwise false.
 */
export function isFragment(node: VNodeChildren): node is VNodeFragment {
    return (
        node !== null && // Block null first
        node !== undefined && // Block undefined
        typeof node === "object" &&
        "type" in node &&
        node.type === DOM_TYPES.FRAGMENT
    );
}
