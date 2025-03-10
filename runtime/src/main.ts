import { batch, deepSignal, effect, signal } from './core/reactivity/api';

// // Create a deep reactive state with nested properties.
// const state = deepSignal({
//   user: {
//     name: 'Alice',
//     age: 30
//   }
// });

// // Register an effect that reacts to changes on nested properties.
// effect(() => {
//   // Accessing the nested property triggers dependency tracking.
//   console.log(`User name is: ${state().user.name}`);
// });

// // Initially, the effect logs: "User name is: Alice"

// // Update a nested property.
// // Because of your proxy's set handler, this change is detected and the effect re-runs.
// state().user.name = 'Bob';

// // Expected log output: "User name is: Bob"

// // You can also replace an entire nested object.
// state().user = { name: 'Charlie', age: 35 };
// // The effect should run again and log: "User name is: Charlie"




// let stateSignal = signal('Alice');
// effect(()=>{
//   console.log(`User name (Signal): ${stateSignal()}`);
// })

// stateSignal.set('Bob');
// stateSignal.set('Charlie');

function testBatching() {
  const countA = signal(0);
  const countB = signal(0);

  effect(() => {
    console.log("Effect triggered");
    console.log(`Count A: ${countA()}`);
    console.log(`Count B: ${countB()}`);
  });

  console.log("---- Initial Run ----");

  // Implicit microtask batching:
  // Both these updates happen synchronously, but the effect runs only once
  countA.set(1);
  countB.set(2);

  // After a microtask, you should see:
  // "Effect triggered", "Count A: 1", "Count B: 2"

  // Explicit batching:
  // The effect won't run until after the batch finishes
  batch(() => {
    countA.set(10);
    countB.set(20);
  });

  // After the batch completes, you should see:
  // "Effect triggered", "Count A: 10", "Count B: 20"
}
function testDeepSignal() {
  const state = deepSignal({
    user: {
      name: "Alice",
      age: 30,
      address: {
        city: "New York",
        zip: "10001"
      }
    },
    settings: {
      theme: "light",
      notifications: true,
    }
  });

  effect(() => {
    console.log("Deep effect triggered:");
    console.log(`User: ${state().user.name}, Age: ${state().user.age}`);
    console.log(`City: ${state().user.address.city}, ZIP: ${state().user.address.zip}`);
    console.log(`Theme: ${state().settings.theme}, Notifications: ${state().settings.notifications}`);
  });

  console.log("---- Initial effect run ----");

  // Implicit microtask batching: multiple nested updates in one tick
  state().user.name = "Bob";
  state().user.age = 35;
  state().user.address.city = "Los Angeles";
  state().user.address.zip = "90001";
  state().settings.theme = "dark";

  // After the microtask flush, the effect should run once with:
  // User: Bob, Age: 35, City: Los Angeles, ZIP: 90001, Theme: dark, Notifications: true

  // Explicit batching: group a set of nested changes
  batch(() => {
    state().user.name = "Charlie";
    state().user.age = 40;
    state().user.address.city = "Chicago";
    state().user.address.zip = "60601";
    state().settings.notifications = false;
  });
  // When the batch finishes, the effect should run once with:
  // User: Charlie, Age: 40, City: Chicago, ZIP: 60601, Theme: dark, Notifications: false

  // Further update outside of any batch
  console.log('---');
  state().settings.theme = "blue";
  state().settings.notifications = true;
  // This update should trigger the effect once more, reflecting the new theme.
}

testDeepSignal();
// testBatching();