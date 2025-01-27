import { defineConfig } from "vite";

export default defineConfig({
    esbuild: {
        jsxFactory: "h",
        jsxFragment: "Fragment",
    },
    server: {
        port: 3000,
        open: true, // Automatically open the browser
    }
})