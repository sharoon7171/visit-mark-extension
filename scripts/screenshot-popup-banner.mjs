#!/usr/bin/env node

import { existsSync, mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { chromium } from "playwright";

async function expandVisitmarkPopupForFullHeight(page, widthPx) {
  await page.evaluate((w) => {
    document.documentElement.style.cssText =
      `width:${w}px!important;max-width:${w}px!important;height:auto!important;min-height:0!important;overflow:visible!important;`;
    document.body.style.cssText =
      "margin:0!important;height:auto!important;overflow:visible!important;";
    const r = document.getElementById("root");
    if (r) {
      r.style.cssText =
        "overflow:visible!important;height:auto!important;min-height:0!important;max-height:none!important;flex:none!important;";
    }
  }, widthPx);
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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const distDir = path.resolve(root, "dist");
const docsDir = path.resolve(root, "docs");
const userDataDir = path.join(os.tmpdir(), `visitmark-screenshot-${Date.now()}`);

const BANNER_W = 1280;
const BANNER_H = 800;
const POPUP_CAPTURE_W = 800;
const BANNER_INSET = 56;

if (!existsSync(path.join(distDir, "manifest.json"))) {
  console.error("Missing dist/. Run: yarn build");
  process.exit(1);
}

mkdirSync(docsDir, { recursive: true });

const bannerPath = path.join(docsDir, "banner-1280x800.png");
const tmpStamp = `${Date.now()}-${process.pid}`;
const popupUiPath = path.join(
  os.tmpdir(),
  `visitmark-popup-ui-${tmpStamp}.png`,
);
const composeHtmlPath = path.join(
  os.tmpdir(),
  `visitmark-banner-compose-${tmpStamp}.html`,
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
  await page.setViewportSize({ width: POPUP_CAPTURE_W, height: 1200 });
  await page.goto(`chrome-extension://${extensionId}/popup.html`, {
    waitUntil: "load",
  });
  await page.getByRole("heading", { name: "VisitMark" }).waitFor({
    state: "visible",
    timeout: 30000,
  });
  await page.evaluate(() => document.fonts.ready);
  await expandVisitmarkPopupForFullHeight(page, POPUP_CAPTURE_W);
  const { width: fullW, height: fullH } = await readDocumentOuterSize(page);
  await page.setViewportSize({
    width: Math.max(POPUP_CAPTURE_W, fullW),
    height: fullH,
  });
  await page.evaluate(() => document.fonts.ready);

  const shell = page.locator("#root > div").first();

  try {
    await shell.screenshot({ path: popupUiPath, type: "png" });

    const imgUi = pathToFileURL(popupUiPath).href;
    const composeHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body {
  width: ${BANNER_W}px;
  height: ${BANNER_H}px;
  overflow: hidden;
}
body {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e4e4e7;
}
body img {
  display: block;
  max-width: ${BANNER_W - BANNER_INSET * 2}px;
  max-height: ${BANNER_H - BANNER_INSET * 2}px;
  width: auto;
  height: auto;
  object-fit: contain;
}
</style>
</head>
<body>
<img src="${imgUi}" alt=""/>
</body>
</html>`;
    writeFileSync(composeHtmlPath, composeHtml, "utf8");

    const bannerPage = await context.newPage();
    try {
      await bannerPage.setViewportSize({ width: BANNER_W, height: BANNER_H });
      await bannerPage.goto(pathToFileURL(composeHtmlPath).href, {
        waitUntil: "load",
      });
      await bannerPage.screenshot({
        path: bannerPath,
        type: "png",
        clip: { x: 0, y: 0, width: BANNER_W, height: BANNER_H },
      });
    } finally {
      await bannerPage.close();
    }
  } finally {
    for (const p of [composeHtmlPath, popupUiPath]) {
      if (existsSync(p)) {
        unlinkSync(p);
      }
    }
  }

  console.log(`Wrote ${bannerPath}`);
} finally {
  await context.close();
}
