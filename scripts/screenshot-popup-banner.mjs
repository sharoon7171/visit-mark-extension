#!/usr/bin/env node

import { existsSync, mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { chromium } from "playwright";

async function expandVisitmarkPopupForFullHeight(page) {
  await page.evaluate(() => {
    document.documentElement.style.cssText =
      "width:600px!important;max-width:600px!important;height:auto!important;min-height:0!important;overflow:visible!important;";
    document.body.style.cssText =
      "margin:0!important;height:auto!important;overflow:visible!important;";
    const r = document.getElementById("root");
    if (r) {
      r.style.cssText =
        "overflow:visible!important;height:auto!important;min-height:0!important;max-height:none!important;flex:none!important;";
    }
  });
  for (let i = 0; i < 12; i += 1) {
    const changed = await page.evaluate(() => {
      let any = false;
      const rootEl = document.getElementById("root");
      if (!rootEl) return false;
      for (const node of rootEl.querySelectorAll("*")) {
        if (node.scrollHeight <= node.clientHeight + 1) continue;
        const st = getComputedStyle(node);
        if (
          st.overflowY === "scroll" ||
          st.overflowY === "auto" ||
          st.overflow === "hidden"
        ) {
          node.style.setProperty("overflow", "visible", "important");
          node.style.setProperty("overflow-y", "visible", "important");
          node.style.setProperty("height", `${node.scrollHeight}px`, "important");
          node.style.setProperty("max-height", "none", "important");
          any = true;
        }
      }
      return any;
    });
    if (!changed) break;
  }
  await page.evaluate(() => {
    const rootEl = document.getElementById("root");
    const shell = rootEl?.firstElementChild;
    if (shell && getComputedStyle(shell).display === "grid") {
      shell.style.setProperty("grid-template-rows", "auto auto auto", "important");
      shell.style.setProperty("height", "auto", "important");
      shell.style.setProperty("min-height", "0", "important");
      shell.style.setProperty("overflow", "visible", "important");
    }
  });
}

async function readDocumentOuterSize(page) {
  return page.evaluate(() => {
    const html = document.documentElement;
    const body = document.body;
    const w = Math.max(
      html.clientWidth,
      html.scrollWidth,
      body.scrollWidth,
    );
    const h = Math.max(html.scrollHeight, body.scrollHeight);
    return { width: w, height: h };
  });
}

async function unionClip(locators) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const loc of locators) {
    const box = await loc.boundingBox();
    if (!box) {
      throw new Error("Missing layout box for panel screenshot");
    }
    minX = Math.min(minX, box.x);
    minY = Math.min(minY, box.y);
    maxX = Math.max(maxX, box.x + box.width);
    maxY = Math.max(maxY, box.y + box.height);
  }
  const x = Math.floor(minX);
  const y = Math.floor(minY);
  const width = Math.ceil(maxX) - x;
  const height = Math.ceil(maxY) - y;
  return { x, y, width, height };
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const distDir = path.resolve(root, "dist");
const docsDir = path.resolve(root, "docs");
const userDataDir = path.join(os.tmpdir(), `visitmark-screenshot-${Date.now()}`);

const BANNER_W = 1280;
const BANNER_H = 800;
const POPUP_W = 600;

if (!existsSync(path.join(distDir, "manifest.json"))) {
  console.error("Missing dist/. Run: yarn build");
  process.exit(1);
}

mkdirSync(docsDir, { recursive: true });

const bannerPath = path.join(docsDir, "banner-1280x800.png");
const tmpStamp = `${Date.now()}-${process.pid}`;
const panelGlobalPath = path.join(
  os.tmpdir(),
  `visitmark-panel-global-${tmpStamp}.png`,
);
const panelSitePath = path.join(
  os.tmpdir(),
  `visitmark-panel-site-${tmpStamp}.png`,
);
const composeHtmlPath = path.join(
  os.tmpdir(),
  `visitmark-banner-dual-${tmpStamp}.html`,
);

const context = await chromium.launchPersistentContext(userDataDir, {
  channel: "chromium",
  headless: true,
  deviceScaleFactor: 1,
  args: [
    `--disable-extensions-except=${distDir}`,
    `--load-extension=${distDir}`,
  ],
});

try {
  let [serviceWorker] = context.serviceWorkers();
  if (!serviceWorker) {
    serviceWorker = await context.waitForEvent("serviceworker");
  }
  const extensionId = serviceWorker.url().split("/")[2];

  const page = await context.newPage();
  await page.setViewportSize({ width: POPUP_W, height: 900 });
  await page.goto(`chrome-extension://${extensionId}/popup.html`, {
    waitUntil: "load",
  });
  await page.getByRole("heading", { name: "VisitMark" }).waitFor({
    state: "visible",
    timeout: 30000,
  });
  await page.evaluate(() => document.fonts.ready);
  await expandVisitmarkPopupForFullHeight(page);
  const { width: fullW, height: fullH } = await readDocumentOuterSize(page);
  await page.setViewportSize({
    width: Math.max(POPUP_W, fullW),
    height: fullH,
  });
  await page.evaluate(() => document.fonts.ready);

  const shell = page.locator("#root > div").first();
  const header = shell.locator(":scope > header");
  const stack = shell.locator(":scope > *").nth(1);
  const footer = shell.locator(":scope > footer");
  const section0 = stack.locator(":scope > section").nth(0);
  const section1 = stack.locator(":scope > section").nth(1);
  const section2 = stack.locator(":scope > section").nth(2);

  const clipGlobal = await unionClip([header, section0]);
  const clipSite = await unionClip([section1, section2, footer]);

  try {
    await page.screenshot({
      path: panelGlobalPath,
      type: "png",
      clip: clipGlobal,
    });
    await page.screenshot({
      path: panelSitePath,
      type: "png",
      clip: clipSite,
    });

    const imgA = pathToFileURL(panelGlobalPath).href;
    const imgB = pathToFileURL(panelSitePath).href;
    const composeHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  width: ${BANNER_W}px;
  height: ${BANNER_H}px;
  position: relative;
  overflow: hidden;
  font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
  background: #fafafa;
}
.shell {
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 0 56px;
}
.bg-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: #3b82f6;
  z-index: 0;
}
.stage {
  position: relative;
  z-index: 1;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 0;
  padding: 48px 0 52px;
}
.panel {
  flex: 1 1 0;
  min-width: 0;
  max-width: 548px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 14px;
}
.panel--a { padding-right: 24px; }
.panel--b { padding-left: 24px; }
.panel-head {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 0 2px 2px;
}
.panel-step {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #6b7280;
}
.panel-title {
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: #111827;
  line-height: 1.35;
}
.frame {
  border-radius: 16px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  box-shadow: 0 20px 40px -16px rgba(17, 24, 39, 0.12);
}
.frame-inner {
  border-radius: 15px;
  overflow: hidden;
  background: #f9fafb;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 120px;
  margin: 1px;
}
.frame img {
  display: block;
  width: 100%;
  height: auto;
  max-height: 560px;
  object-fit: contain;
}
.spine {
  width: 32px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.spine-rule {
  width: 1px;
  height: 220px;
  background: #d1d5db;
}
</style>
</head>
<body>
<div class="shell">
  <div class="bg-bar" aria-hidden="true"></div>
  <main class="stage">
    <article class="panel panel--a">
      <div class="panel-head">
        <span class="panel-step">Global</span>
        <h2 class="panel-title">Defaults for every site</h2>
      </div>
      <div class="frame">
        <div class="frame-inner"><img src="${imgA}" alt=""/></div>
      </div>
    </article>
    <div class="spine"><div class="spine-rule"></div></div>
    <article class="panel panel--b">
      <div class="panel-head">
        <span class="panel-step">Context</span>
        <h2 class="panel-title">This site &amp; link targets</h2>
      </div>
      <div class="frame">
        <div class="frame-inner"><img src="${imgB}" alt=""/></div>
      </div>
    </article>
  </main>
</div>
</body>
</html>`;
    writeFileSync(composeHtmlPath, composeHtml, "utf8");

    const bannerPage = await context.newPage();
    try {
      await bannerPage.setViewportSize({ width: BANNER_W, height: BANNER_H });
      await bannerPage.goto(pathToFileURL(composeHtmlPath).href, {
        waitUntil: "load",
      });
      await bannerPage.evaluate(() => document.fonts.ready);
      await bannerPage.screenshot({
        path: bannerPath,
        type: "png",
        clip: { x: 0, y: 0, width: BANNER_W, height: BANNER_H },
      });
    } finally {
      await bannerPage.close();
    }
  } finally {
    for (const p of [composeHtmlPath, panelGlobalPath, panelSitePath]) {
      if (existsSync(p)) {
        unlinkSync(p);
      }
    }
  }

  console.log(`Wrote ${bannerPath}`);
} finally {
  await context.close();
}
