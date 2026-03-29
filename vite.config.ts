import { copyFileSync, cpSync, existsSync } from "node:fs";
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  plugins: [
    tailwindcss(),
    react(),
    {
      name: "copy-manifest",
      closeBundle() {
        const root = path.resolve(__dirname);
        const dist = path.join(root, "dist");
        copyFileSync(path.join(root, "manifest.json"), path.join(dist, "manifest.json"));
        const iconsDir = path.join(root, "icons");
        if (existsSync(iconsDir)) {
          cpSync(iconsDir, path.join(dist, "icons"), { recursive: true });
        }
      },
    },
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  publicDir: false,
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: path.resolve(__dirname, "popup.html"),
      },
      output: {
        entryFileNames() {
          return "popup.js";
        },
        chunkFileNames: "[name].js",
        assetFileNames(assetInfo) {
          const names = assetInfo.names ?? [];
          if (names.some((n) => n.endsWith(".css"))) {
            return "popup.css";
          }
          return "assets/[name][extname]";
        },
      },
    },
  },
});
