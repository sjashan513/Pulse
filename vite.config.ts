import { defineConfig } from "vite";

export default defineConfig({
    build: {
        target: 'esnext',
        outDir: 'dist',
        lib: {
            entry: 'runtime/src/core/utils/run-benchmark.ts', // Entry point for the benchmark
            name: 'Benchmark',
            fileName: 'run-benchmark',
            formats: ['es'], // Output as ESM for Node.js
        },
        rollupOptions: {
            external: [], // No external dependencies for now
        },
    },
    resolve: {
        alias: {
            '@': '/runtime/src',
        },
    },
    server: {
        port: 3000,
        open: true, // Automatically open the browser
    }
})