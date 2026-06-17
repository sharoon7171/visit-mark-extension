#!/usr/bin/env node

import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  closeOtherPages,
  getExtId,
  injectVisitmarkStorage,
  launchExtensionBrowser,
  requireMacOS,
  snapBrowserWindow,
} from "./screenshot-browser.mjs";

const PAGE_URL = "https://www.bbc.com/news";
const PAGE_ZOOM = 0.8;
const SCROLL_Y = 380;

const STORY_LINK_RE =
  /^https:\/\/www\.bbc\.com\/(news\/(articles|live)\/[^/?#]+|sport\/[^/]+\/live\/[^/?#]+)/;

const DEMO_SETTINGS = {
  masterEnabled: true,
  defaultHighlightColor: "#c2410c",
  highlightVisitedCssEnabled: true,
  highlightHistoryLinksEnabled: true,
};

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const extPath = path.join(rootDir, "dist");
const outPath = path.join(rootDir, "docs", "screenshot-popup.png");

async function collectHomepageStoryLinks(page) {
  return page.evaluate(
    ({ patternSource }) => {
      const pattern = new RegExp(patternSource);
      const root = document.querySelector("main") ?? document.body;
      const seen = new Set();
      const links = [];
      for (const anchor of root.querySelectorAll("a[href]")) {
        const href = anchor.href.split("?")[0].split("#")[0];
        if (!pattern.test(href) || seen.has(href)) {
          continue;
        }
        seen.add(href);
        links.push(href);
        if (links.length >= 5) {
          break;
        }
      }
      return links;
    },
    { patternSource: STORY_LINK_RE.source },
  );
}

if (!existsSync(extPath)) {
  console.error("Run npm run build first. dist/ not found.");
  process.exit(1);
}

requireMacOS();
mkdirSync(path.dirname(outPath), { recursive: true });

const context = await launchExtensionBrowser(extPath);

try {
  const extId = await getExtId(context);
  const page = context.pages()[0] ?? (await context.newPage());
  const [sw] = context.serviceWorkers();

  await page.goto(`chrome-extension://${extId}/popup.html`, {
    waitUntil: "domcontentloaded",
    timeout: 15000,
  });
  await injectVisitmarkStorage(page, DEMO_SETTINGS);

  await page.goto(PAGE_URL, { waitUntil: "load", timeout: 60000 });
  await page.waitForSelector("main a[href]", { timeout: 30000 });

  try {
    const consent = page.locator('button:has-text("Yes, I agree")').first();
    if (await consent.isVisible({ timeout: 2000 })) {
      await consent.click();
    }
  } catch {}

  const storyLinks = await collectHomepageStoryLinks(page);
  if (storyLinks.length === 0) {
    throw new Error("No BBC story links found on the news homepage.");
  }

  for (const url of storyLinks) {
    await page.goto(url, { waitUntil: "load", timeout: 60000 });
    await page.waitForTimeout(400);
  }

  await page.goto(PAGE_URL, { waitUntil: "load", timeout: 60000 });
  await page.waitForSelector("main a[href]", { timeout: 30000 });

  await sw.evaluate(async (zoom) => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      await chrome.tabs.setZoom(tab.id, zoom);
    }
  }, PAGE_ZOOM);

  await page.evaluate((scrollY) => {
    const scroller = document.scrollingElement ?? document.documentElement;
    scroller.scrollTo(0, scrollY);
  }, SCROLL_Y);

  await page.waitForTimeout(1200);
  await closeOtherPages(context, page);
  await page.bringToFront();
  await page.waitForTimeout(500);

  const popupResult = await sw.evaluate(() =>
    chrome.action
      .openPopup()
      .then(() => "ok")
      .catch((error) => String(error?.message || error)),
  );
  if (popupResult !== "ok") {
    throw new Error(`Could not open extension popup: ${popupResult}`);
  }

  await page.waitForTimeout(600);
  await snapBrowserWindow(page, outPath);
  console.log("Screenshot saved to", outPath);
} finally {
  await context.close();
}
