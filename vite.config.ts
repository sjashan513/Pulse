import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig(({ command }) => ({
  root: ".",                                     // dev server looks at ./index.html
  // ---------- DEV-SERVER SETTINGS ----------
  server: {
    port: 3000,
    open: true,
    hmr: { overlay: true },

    // ⭐ ADD THIS ⭐
    watch: {
      usePolling: true,      // fall back to polling
      interval: 250          // ~4× per second; tweak if CPU is high
    }
  },

  // ---------- BUILD-ONLY SETTINGS ----------
  ...(command === "build" && {
    build: {
      target: "esnext",
      outDir: "dist",
      lib: {
        entry: resolve(__dirname, "runtime/src/core/utils/run-benchmark.ts"),
        name: "Benchmark",
        fileName: "run-benchmark",
        formats: ["es", "cjs"]
      },
      rollupOptions: {
        external: [],
        output: { manualChunks: undefined }
      },
      sourcemap: true,
      minify: "terser"
    }
  }),

  // ---------- PATH ALIASES ----------
  resolve: {
    alias: {
      "@": resolve(__dirname, "runtime/src"),
      "@core": resolve(__dirname, "runtime/src/core")
    }
  }
}));
