import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
    build: {
        target: 'esnext',
        outDir: 'dist',
        lib: {
            entry: resolve(__dirname, 'runtime/src/core/utils/run-benchmark.ts'),
            name: 'Benchmark',
            fileName: 'run-benchmark',
            formats: ['es', 'cjs'], // Output as ESM and CommonJS for better compatibility
        },
        rollupOptions: {
            external: [], // No external dependencies for now
            output: {
                // Ensures proper code splitting and optimizations
                manualChunks: undefined,
            },
        },
        sourcemap: true, // Generate source maps for debugging
        minify: 'terser', // Use terser for better minification
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, 'runtime/src'),
            '@core': resolve(__dirname, 'runtime/src/core'),
        },
    },
    server: {
        port: 3000,
        open: true, // Automatically open the browser
        hmr: {
            overlay: true, // Show errors as overlay
        },
    },
})