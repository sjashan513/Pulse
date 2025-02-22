import { computed, signal } from "./core/reactivity/index";

// Create base signals.
const a = signal(1);
const b = signal(2);

// Create a computed signal that multiplies signals 'a' and 'b'.
const comp = computed(() => {
  return a.get() * b.get();
});

const nestedComp = computed(() => {
  return comp.get() * 2;
})
document.getElementById('btn')?.addEventListener('click', () => {
  console.log('Increase the value', a.get(), ' + 1');
  a.set(a.get() + 1);
  console.log('Updated computed', comp.get());
  console.log('Updated nested computed', nestedComp.get());
})
console.log('computed', comp.get());
console.log('nested computed', nestedComp.get());



// Update 'a' after 1 second to trigger re-evaluation.
// setTimeout(() => {

//   console.log('Updating signal "a" to 4');
//   a.set(4);
  // console.log('Updated computed', comp.get());
  // console.log('Updated nested computed', nestedComp.get());

// }, 1000);


