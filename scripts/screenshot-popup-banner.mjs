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
const POPUP_DEVICE_SCALE = Math.max(
  1,
  Math.ceil(7680 / POPUP_CAPTURE_W),
);

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
  deviceScaleFactor: POPUP_DEVICE_SCALE,
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
    await shell.screenshot({
      path: popupUiPath,
      type: "png",
      scale: "device",
    });

    const imgUi = pathToFileURL(popupUiPath).href;
    const shotMaxW = Math.round(BANNER_W * 0.52);
    const shotMaxH = BANNER_H - BANNER_INSET * 2;
    const composeHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap" rel="stylesheet"/>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body {
  width: ${BANNER_W}px;
  height: ${BANNER_H}px;
  overflow: hidden;
}
body {
  font-family: "Plus Jakarta Sans", system-ui, sans-serif;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 40px;
  padding: ${BANNER_INSET}px ${BANNER_INSET + 16}px;
  background-color: #0f172a;
  background-image:
    radial-gradient(ellipse 90% 70% at 12% 18%, rgba(59, 130, 246, 0.35) 0%, transparent 55%),
    radial-gradient(ellipse 70% 55% at 88% 78%, rgba(249, 115, 22, 0.22) 0%, transparent 50%),
    radial-gradient(ellipse 55% 45% at 92% 12%, rgba(56, 189, 248, 0.15) 0%, transparent 45%),
    linear-gradient(165deg, #0f172a 0%, #1e293b 38%, #0c4a6e 72%, #0f172a 100%);
}
body::before {
  content: "";
  position: absolute;
  inset: 0;
  opacity: 0.45;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  pointer-events: none;
}
body::after {
  content: "";
  position: absolute;
  width: 420px;
  height: 420px;
  left: -120px;
  bottom: -100px;
  border-radius: 50%;
  background: rgba(59, 130, 246, 0.12);
  filter: blur(60px);
  pointer-events: none;
}
.deco {
  position: absolute;
  z-index: 0;
  border-radius: 50%;
  pointer-events: none;
  filter: blur(48px);
}
.deco-a {
  width: 280px;
  height: 280px;
  top: -80px;
  right: 22%;
  background: rgba(249, 115, 22, 0.18);
}
.deco-b {
  width: 200px;
  height: 200px;
  bottom: 12%;
  left: 38%;
  background: rgba(96, 165, 250, 0.14);
}
.copy {
  position: relative;
  z-index: 1;
  flex: 0 0 min(400px, 34vw);
  max-width: 420px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  align-items: flex-start;
  align-self: center;
}
.badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #e0f2fe;
  background: rgba(15, 23, 42, 0.72);
  border: 1px solid rgba(186, 230, 253, 0.4);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.45);
}
.headline {
  font-size: 38px;
  font-weight: 800;
  line-height: 1.12;
  letter-spacing: -0.03em;
  color: #ffffff;
  text-shadow:
    0 1px 2px rgba(0, 0, 0, 0.35),
    0 2px 20px rgba(0, 0, 0, 0.25);
}
.sub {
  font-size: 16px;
  font-weight: 600;
  line-height: 1.55;
  color: #f1f5f9;
  max-width: 380px;
  text-shadow:
    0 0 1px rgba(15, 23, 42, 0.9),
    0 1px 3px rgba(15, 23, 42, 0.75),
    0 0 18px rgba(15, 23, 42, 0.35);
}
.cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: 6px;
  padding: 14px 26px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  background: linear-gradient(180deg, #ffffff 0%, #e2e8f0 100%);
  border: 1px solid rgba(248, 250, 252, 0.9);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.6) inset,
    0 14px 36px rgba(15, 23, 42, 0.45),
    0 4px 12px rgba(59, 130, 246, 0.25);
}
.shot-wrap {
  position: relative;
  z-index: 1;
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}
.shot-frame {
  position: relative;
  transform: rotate(-2.2deg);
}
.shot-frame::before {
  content: "";
  position: absolute;
  inset: -3px;
  border-radius: 18px;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.55) 0%,
    rgba(148, 163, 184, 0.25) 50%,
    rgba(59, 130, 246, 0.2) 100%
  );
  z-index: -1;
}
.shot-frame img {
  display: block;
  max-width: ${shotMaxW}px;
  max-height: ${shotMaxH}px;
  width: auto;
  height: auto;
  object-fit: contain;
  border-radius: 14px;
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.2),
    0 28px 56px rgba(15, 23, 42, 0.55),
    0 12px 24px rgba(59, 130, 246, 0.12);
}
</style>
</head>
<body>
<div class="deco deco-a" aria-hidden="true"></div>
<div class="deco deco-b" aria-hidden="true"></div>
<div class="copy">
  <span class="badge">Chrome extension</span>
  <h1 class="headline">Visited links you can actually see.</h1>
  <p class="sub">Custom highlight colors for every site—or just this tab. Works with Chrome&rsquo;s visited state and optional history matching.</p>
  <span class="cta">Add to Chrome</span>
</div>
<div class="shot-wrap">
  <div class="shot-frame">
    <img src="${imgUi}" alt=""/>
  </div>
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
      await bannerPage.screenshot({
        path: bannerPath,
        type: "png",
        scale: "css",
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
