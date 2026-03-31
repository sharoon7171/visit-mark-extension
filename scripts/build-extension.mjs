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

const projectRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const buildDir = path.join(projectRoot, "build");
const distDir = path.join(projectRoot, "dist");

const manifest = JSON.parse(
  readFileSync(path.join(projectRoot, "manifest.json"), "utf8"),
);

const version = manifest.version;
const zipPath = path.join(buildDir, `${version}.zip`);

execFileSync("yarn", ["build"], { cwd: projectRoot, stdio: "inherit" });

if (!existsSync(path.join(distDir, "manifest.json"))) {
  process.stderr.write(`Missing dist output: ${distDir}\n`);
  process.exit(1);
}

mkdirSync(buildDir, { recursive: true });
for (const entry of readdirSync(buildDir)) {
  if (entry.endsWith(".zip")) {
    unlinkSync(path.join(buildDir, entry));
  }
}

execFileSync("zip", ["-r", zipPath, "."], { cwd: distDir, stdio: "inherit" });

console.log(zipPath);
