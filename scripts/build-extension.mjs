#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  unlinkSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(root, "..");
const buildDir = path.join(projectRoot, "build");
const distDir = path.join(projectRoot, "dist");

const pkg = JSON.parse(
  readFileSync(path.join(projectRoot, "package.json"), "utf8"),
);
const manifest = JSON.parse(
  readFileSync(path.join(projectRoot, "manifest.json"), "utf8"),
);
const slug = pkg.name ?? "extension";
const version = manifest.version;
const zipName = `${slug}-${version}.zip`;
const zipPath = path.join(buildDir, zipName);

execFileSync("npm", ["run", "build"], { cwd: projectRoot, stdio: "inherit" });

mkdirSync(buildDir, { recursive: true });
if (existsSync(buildDir)) {
  for (const name of readdirSync(buildDir)) {
    if (name.endsWith(".zip")) {
      unlinkSync(path.join(buildDir, name));
    }
  }
}

execFileSync("zip", ["-r", zipPath, "."], {
  cwd: distDir,
  stdio: "inherit",
});

console.log(zipPath);
