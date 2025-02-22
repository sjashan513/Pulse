import { DOM_TYPES, isFragment, PropsType, VNode, VNodeChildren, VNodeFragment, VNodeText } from "./types/vdom.types"

/**
 * Recursively flattens an array of VNodeChildren into a flat array of VNodes.
 *
 * This function processes each child in the `rawChildren` array, handling nested arrays,
 * fragments, and primitive types. It converts primitives to text nodes and appends valid
 * VNodes to the `flattedArr` array.
 *
 * @param rawChildren - The raw array of VNodeChildren, which may include nested arrays,
 *                      fragments, primitives, or null/undefined values.
 * @param flattedArr - The array that accumulates the flattened VNodes.
 */
function flattenChildren(rawChildren: VNodeChildren[], flattedArr: VNode[]) {
    for (const child of rawChildren) {
        if (!child) continue;

        if (Array.isArray(child)) {
            flattenChildren(child, flattedArr); // Recurse into nested arrays
        } else if (isFragment(child)) {
            flattenChildren(child.children, flattedArr); // Dissolve fragments
        } else if (typeof child === "string" || typeof child === "number" || typeof child === "boolean") {
            flattedArr.push(hString(String(child))); // Convert primitives to text
        } else {
            flattedArr.push(child as VNode); // Assume valid VNode
        }
    }
}

/**
 * Cleans and sanitizes the props object by handling boolean and event handler properties.
 *
 * - **Boolean Props**: HTML standarts
 *   - If the value is `true`, sets the property value to an empty string (`""`).
 *   - If the value is `false`, removes the property from the props object.
 *
 * - **Event Handler Props** (keys starting with `'on'`):
 *   - If the value is not a function, logs a warning and removes the property.
 *
 * This ensures that the props object is in a consistent state and avoids invalid or unintended
 * property values, which can prevent potential bugs and improve performance during rendering.
 *
 * @param props - The props object to clean and sanitize.
 */
function cleanProps(props: PropsType) {
    Object.entries(props).forEach(([key, value]) => {
        if (typeof value === 'boolean') {
            if (value) props[key] = "";
            else delete props[key];
        } else if (key.startsWith('on') && typeof value !== 'function') {
            console.warn(`Event handler "${key}" must be a function!`);
            delete props[key]; // Remove invalid listener
        }
    })
}

/**
 * Creates a Virtual DOM element node.
 *
 * This function constructs a `VNode` of type `ELEMENT` with the specified tag, properties,
 * and children. It processes the `props` to extract the `key` for reconciliation and
 * flattens the `children` using the `flattenChildren` helper function.
 *
 * @param tag - The tag name of the element (e.g., 'div', 'span').
 * @param props - An optional record of properties/attributes for the element.
 *                The `key` property is extracted for reconciliation purposes.
 * @param children - An optional array of child VNodeChildren, which can include
 *                   nested arrays, fragments, primitives, or other VNodes.
 * @returns A `VNode` representing the created element.
 */
export function h(
    tag: string,
    props?: Record<string, unknown>,
    children?: VNodeChildren[]
): VNode {
    const { key, ...nodeProps } = props || {}; // 🗝️ Extract key and save the rest of the nodes in the nodeProps
    const flattedArr: VNode[] = [];
    if (nodeProps) { cleanProps(nodeProps) };
    if (children) flattenChildren(children, flattedArr);

    return {
        tag,
        props: nodeProps || {}, // 🔥 key removed from props
        children: flattedArr,
        type: DOM_TYPES.ELEMENT,
        key, // 🎯 Top-level key for reconciliation
    };
}

/**
 * Creates a Virtual DOM text node.
 *
 * This function constructs a `VNodeText` node with the specified string value.
 * It is used to represent text content within the Virtual DOM.
 *
 * @param str - The string content of the text node.
 * @returns A `VNodeText` representing the text node.
 */
export function hString(str: string): VNodeText {
    return {
        type: DOM_TYPES.TEXT,
        value: str,
    }
}

/**
 * Creates a Virtual DOM fragment node.
 *
 * This function constructs a `VNodeFragment` node that groups multiple children
 * without adding extra DOM elements. It processes the `children` by flattening
 * them into a flat array of VNodes.
 *
 * @param children - An array of VNodeChildren, which can include nested arrays,
 *                   fragments, primitives, or other VNodes.
 * @returns A `VNodeFragment` representing the fragment node.
 */
export function hFragment(children: VNodeChildren[]): VNodeFragment {
    const flattedArr: VNode[] = [];
    flattenChildren(children, flattedArr);
    return {
        type: DOM_TYPES.FRAGMENT,
        children: flattedArr,
    };
}
