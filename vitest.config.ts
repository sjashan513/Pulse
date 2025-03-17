import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        globals: true,
        environment: "jsdom", // for browser-like environment
        setupFiles: './test/setup.ts', // initialize test environment
    }
})