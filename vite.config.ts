import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  rmSync,
} from "node:fs";
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { build, defineConfig } from "vite";

const root = path.resolve(import.meta.dirname);

async function bundleServiceWorker(): Promise<void> {
  const tmp = path.join(root, ".tmp-vite-bg");
  const distDir = path.join(root, "dist");
  const outFile = path.join(tmp, "background.js");
  const dest = path.join(distDir, "background.js");
  try {
    await build({
      configFile: false,
      root,
      publicDir: false,
      resolve: {
        alias: {
          "@": path.join(root, "src"),
        },
      },
      build: {
        emptyOutDir: true,
        outDir: tmp,
        lib: {
          entry: path.join(root, "src/background/index.ts"),
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
    if (!existsSync(outFile)) {
      throw new Error(
        `service-worker bundle missing: ${path.relative(root, outFile)}`,
      );
    }
    mkdirSync(distDir, { recursive: true });
    copyFileSync(outFile, dest);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

export default defineConfig({
  base: "./",
  plugins: [
    tailwindcss(),
    react(),
    {
      name: "extension-postbuild",
      apply: "build",
      async closeBundle() {
        await bundleServiceWorker();
        const dist = path.join(root, "dist");
        copyFileSync(
          path.join(root, "manifest.json"),
          path.join(dist, "manifest.json"),
        );
        const iconsDir = path.join(root, "icons");
        if (existsSync(iconsDir)) {
          cpSync(iconsDir, path.join(dist, "icons"), { recursive: true });
        }
      },
    },
  ],
  resolve: {
    alias: {
      "@": path.join(root, "src"),
    },
  },
  publicDir: false,
  build: {
    outDir: "dist",
    emptyOutDir: true,
    cssCodeSplit: false,
    rollupOptions: {
      input: {
        popup: path.join(root, "popup.html"),
      },
      output: {
        entryFileNames: "popup.js",
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
