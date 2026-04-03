import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { build, defineConfig } from "vite";

const root = path.resolve(import.meta.dirname);

const productionMinify = {
  cssMinify: "esbuild" as const,
  esbuild: {
    legalComments: "none" as const,
  },
  minify: "esbuild" as const,
};

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
        ...productionMinify,
        emptyOutDir: true,
        outDir: tmp,
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
          path.join(root, "public/manifest.json"),
          path.join(dist, "manifest.json"),
        );
        const iconsDir = path.join(root, "public/icons");
        if (existsSync(iconsDir)) {
          cpSync(iconsDir, path.join(dist, "icons"), { recursive: true });
        }
        const nestedPopup = path.join(dist, "public/popup.html");
        const rootPopup = path.join(dist, "popup.html");
        if (existsSync(nestedPopup)) {
          const html = readFileSync(nestedPopup, "utf8")
            .replaceAll('src="../popup.js"', 'src="./popup.js"')
            .replaceAll('href="../popup.css"', 'href="./popup.css"');
          writeFileSync(rootPopup, html);
          rmSync(path.join(dist, "public"), { recursive: true, force: true });
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
    ...productionMinify,
    outDir: "dist",
    emptyOutDir: true,
    cssCodeSplit: false,
    rollupOptions: {
      input: {
        popup: path.join(root, "public/popup.html"),
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
