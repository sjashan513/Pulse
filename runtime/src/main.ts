/************************************************************************
 * 1) Large Test String
 ************************************************************************/
const performanceTestString = `
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

console.log("Benchmarking with test string length:", performanceTestString.length);

/************************************************************************
 * 2) IMPORTS (WASM + your TS parser)
 ************************************************************************/
// Import your WASM module (compiled with --bind)
import createModule from './core/compiler/tokenizer.mjs';
import { parseHtml } from './core/reactivity';
import { Tokenizer } from './core/reactivity/internals/tokenizer';

// Assume you have a TS/JS parser function like:
//    function tsParser(input: string): ReturnType<any> { ... }
// ^ Adjust the path/function name as needed.

/************************************************************************
 * 3) Configure the number of runs
 ************************************************************************/
const ITERATIONS = 1000000; // Example: parse the string 1000 times

/************************************************************************
 * 4) Benchmark: WASM tokenizer
 ************************************************************************/
async function benchmarkWasmTokenizer() {
  // Load/initialize the WASM module
  const wasmModule = await createModule();

  const start = performance.now();
  for (let i = 0; i < ITERATIONS; i++) {
    wasmModule.tokenize(performanceTestString);
  }
  const end = performance.now();

  console.log(`[WASM Tokenizer] ${ITERATIONS} iterations took ${end - start} ms`);
}

/************************************************************************
 * 5) Benchmark: TS parser
 ************************************************************************/
function benchmarkTsParser() {
  const start = performance.now();
  for (let i = 0; i < ITERATIONS; i++) {
    const tokenizer = new Tokenizer(performanceTestString);
    const tokens = tokenizer.tokenize();
  }
  const end = performance.now();

  console.log(`[TS Parser] ${ITERATIONS} iterations took ${end - start} ms`);
}

/************************************************************************
 * 6) Run Both Benchmarks
 ************************************************************************/
async function runAllBenchmarks() {
  await benchmarkWasmTokenizer();
  benchmarkTsParser();
}

runAllBenchmarks().catch(error => {
  console.error("Error during benchmarking:", error);
});
