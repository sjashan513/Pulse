import { DOM_TYPES, VNode, VNodeFragment, VNodeText } from "../../types/vdom.types"
import { mapTextNodes, withoutNull } from "../../utils/arrays"



export function h(tag: string, props?: Record<string, unknown>, children?: (VNode | string)[]): VNode {
    return {
        tag,
        props: props || {},
        children: mapTextNodes(withoutNull(children || [])),
        type: DOM_TYPES.ELEMENT,
    }
}

export function hString(str: string): VNodeText {
    return {
        type: DOM_TYPES.TEXT,
        value: str,
    }
}

export function hFragment(vNodes: VNode[]): VNodeFragment {
    return {
        type: DOM_TYPES.FRAGMENT,
        children: mapTextNodes(withoutNull(vNodes)),
    }
}