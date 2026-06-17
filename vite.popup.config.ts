import {
  copyFileSync,
  cpSync,
  existsSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

import { productionMinify, resolveAlias, root, watchOptions } from "./vite.shared";

function finalizeExtensionDist(): void {
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
  if (!existsSync(nestedPopup)) {
    return;
  }
  const html = readFileSync(nestedPopup, "utf8")
    .replaceAll('src="../popup.js"', 'src="./popup.js"')
    .replaceAll('href="../popup.css"', 'href="./popup.css"');
  writeFileSync(rootPopup, html);
  rmSync(path.join(dist, "public"), { recursive: true, force: true });
}

export default defineConfig({
  base: "./",
  plugins: [
    tailwindcss(),
    react(),
    {
      name: "finalize-extension-dist",
      apply: "build",
      closeBundle: finalizeExtensionDist,
    },
  ],
  resolve: {
    alias: resolveAlias,
  },
  publicDir: false,
  build: {
    ...productionMinify,
    outDir: "dist",
    emptyOutDir: false,
    cssCodeSplit: false,
    watch: watchOptions,
    rollupOptions: {
      input: {
        popup: path.join(root, "public/popup.html"),
      },
      output: {
        entryFileNames: "popup.js",
        chunkFileNames: "[name].js",
        assetFileNames(assetInfo) {
          const names = assetInfo.names ?? [];
          if (names.some((name) => name.endsWith(".css"))) {
            return "popup.css";
          }
          return "assets/[name][extname]";
        },
      },
    },
  },
});
