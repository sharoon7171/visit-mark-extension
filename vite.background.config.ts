import path from "node:path";

import { defineConfig } from "vite";

import { productionMinify, resolveAlias, root, watchOptions } from "./vite.shared";

export default defineConfig({
  resolve: {
    alias: resolveAlias,
  },
  publicDir: false,
  build: {
    ...productionMinify,
    emptyOutDir: false,
    outDir: "dist",
    watch: watchOptions,
    lib: {
      entry: path.join(root, "src/service-worker/index.ts"),
      name: "visitedlinksBg",
      formats: ["iife"],
      fileName: () => "background",
    },
    rollupOptions: {
      output: {
        entryFileNames: "background.js",
      },
    },
  },
});
