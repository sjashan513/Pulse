import { h } from "./core/vdom/h";
import { VNode } from "./types/vdom.types";


export function App(): VNode {
  return h('div', { class: 'app' }, ['My first app']);
}

console.log(App());