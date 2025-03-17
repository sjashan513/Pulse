import { signal } from "./core/reactivity";
import { css, defineComponent, html } from "./core/phase2-compiler";

export default defineComponent({
  render() {
    const count = signal(0);
    const increment = () => count.set(count() + 1);

    return html`
      <div>
        <span>Count: count()</span>
        <!-- long comment with text and 
        newlines -->
        <button @click="increment" value="test value">Add</button>
        <p>Text
        with
        tabs		and
        newlines</p>
        <!-- short -->
        <div>Inner<div>Nested</div></div>
    </div>
    `;
  },
});