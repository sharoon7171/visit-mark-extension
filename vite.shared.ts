import path from "node:path";

export const root = path.resolve(import.meta.dirname);

export const isWatch = process.argv.includes("--watch");

export const resolveAlias = {
  "@": path.join(root, "src"),
};

export const productionMinify = {
  cssMinify: "esbuild" as const,
  esbuild: {
    legalComments: "none" as const,
  },
  minify: "esbuild" as const,
} as const;

export const watchOptions = isWatch ? { buildDelay: 250 } : null;
