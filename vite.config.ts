import { copyFileSync, cpSync, existsSync } from "node:fs";
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { build, defineConfig } from "vite";

const rootDir = path.resolve(__dirname);

export default defineConfig({
  base: "./",
  plugins: [
    tailwindcss(),
    react(),
    {
      name: "bundle-background",
      apply: "build",
      async closeBundle() {
        await build({
          configFile: false,
          root: rootDir,
          resolve: {
            alias: {
              "@": path.join(rootDir, "src"),
            },
          },
          build: {
            emptyOutDir: false,
            outDir: path.join(rootDir, "dist"),
            lib: {
              entry: path.join(rootDir, "src/background/index.ts"),
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
      },
    },
    {
      name: "copy-manifest",
      closeBundle() {
        const dist = path.join(rootDir, "dist");
        copyFileSync(
          path.join(rootDir, "manifest.json"),
          path.join(dist, "manifest.json"),
        );
        const iconsDir = path.join(rootDir, "icons");
        if (existsSync(iconsDir)) {
          cpSync(iconsDir, path.join(dist, "icons"), { recursive: true });
        }
      },
    },
  ],
  resolve: {
    alias: {
      "@": path.join(rootDir, "src"),
    },
  },
  publicDir: false,
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: path.join(rootDir, "popup.html"),
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
