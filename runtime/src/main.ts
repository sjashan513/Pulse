import { deepSignal, effect, signal } from './core/reactivity/api';

// Create a deep reactive state with nested properties.
const state = deepSignal({
  user: {
    name: 'Alice',
    age: 30
  }
});

// Register an effect that reacts to changes on nested properties.
effect(() => {
  // Accessing the nested property triggers dependency tracking.
  console.log(`User name is: ${state().user.name}`);
});

// Initially, the effect logs: "User name is: Alice"

// Update a nested property.
// Because of your proxy's set handler, this change is detected and the effect re-runs.
state().user.name = 'Bob';

// Expected log output: "User name is: Bob"

// You can also replace an entire nested object.
state().user = { name: 'Charlie', age: 35 };
// The effect should run again and log: "User name is: Charlie"




let stateSignal = signal('Alice');
effect(()=>{
  console.log(`User name (Signal): ${stateSignal()}`);
})

stateSignal.set('Bob');
stateSignal.set('Charlie');
