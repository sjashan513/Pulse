import { h } from "./core/vdom/h";
import { mountDOM } from "./core/vdom/mount-dom";
import { updateDOM } from "./core/vdom/update-dom";


const app = document.getElementById('app');

// Initial Virtual DOM
const oldVDOM = h('div', { id: 'container' }, [
  h('h1', {}, ['Hello, World!']),
  h('ul', {}, [
    h('li', { key: 1 }, ['Apple']),
    h('li', { key: 2 }, ['Banana']),
  ]),
]);

// New Virtual DOM
const newVDOM = h('div', { id: 'container' }, [
  h('h1', {}, ['Hello, Virtual DOM!']),
  h('ul', {}, [
    h('li', { key: 2 }, ['Banana']),
    h('li', { key: 3 }, ['Cherry']),
  ]),
]);
console.log(oldVDOM)

// Mount the initial Virtual DOM
if (app) mountDOM(oldVDOM, app);
// After 2 seconds, update the DOM
setTimeout(() => {
  if (app) updateDOM(oldVDOM, newVDOM, app);
}, 2000);
