import type { HostSiteSettings } from "@/preferences/host-site-settings";
import type { ExtensionSyncedOptions } from "@/preferences/synced-options";

import { isInjectablePageUrl, planHighlightForPageUrl } from "./bootstrap";
import { listNormalizedUrlsWithHistoryVisits } from "./history-matches";
import {
  applyHistoryHighlightColor,
  clearHistoryHighlightsOnPage,
  collectAnchorHrefsFromPage,
  syncVisitmarkVisitedCssOnPage,
} from "./page-runtime";
import {
  LEGACY_NEUTRALIZE_VISITED_LINK_CSS,
  buildVisitedLinkCss,
} from "./visited-link-css";

async function syncVisitedCssFromOptions(
  tabId: number,
  css: string | null,
): Promise<void> {
  try {
    await chrome.scripting.executeScript({
      args: [css],
      func: syncVisitmarkVisitedCssOnPage,
      target: { tabId },
      world: "MAIN",
    });
  } catch {}
}

async function cleanupHistoryHighlights(tabId: number): Promise<void> {
  try {
    await chrome.scripting.executeScript({
      func: clearHistoryHighlightsOnPage,
      target: { tabId },
      world: "MAIN",
    });
  } catch {}
}

export async function applyHighlightToTab(
  tabId: number,
  tab: chrome.tabs.Tab,
  synced: ExtensionSyncedOptions,
  hostMap: Record<string, HostSiteSettings>,
): Promise<void> {
  const url = tab.url;
  if (!url || !isInjectablePageUrl(url)) {
    await syncVisitedCssFromOptions(tabId, null);
    await cleanupHistoryHighlights(tabId);
    return;
  }
  const plan = planHighlightForPageUrl(url, synced, hostMap);
  if (!plan) {
    await syncVisitedCssFromOptions(tabId, null);
    await cleanupHistoryHighlights(tabId);
    return;
  }
  const visitedCss =
    plan.active && plan.visitedCss ? buildVisitedLinkCss(plan.color) : null;
  await syncVisitedCssFromOptions(tabId, visitedCss);
  if (!plan.active) {
    try {
      await chrome.scripting.removeCSS({
        css: LEGACY_NEUTRALIZE_VISITED_LINK_CSS,
        target: { tabId },
      });
    } catch {}
  }
  if (plan.historyHighlight) {
    let hrefs: string[] = [];
    try {
      const [res] = await chrome.scripting.executeScript({
        func: collectAnchorHrefsFromPage,
        target: { tabId },
        world: "MAIN",
      });
      hrefs = (res?.result as string[]) ?? [];
    } catch {
      hrefs = [];
    }
    const matches = await listNormalizedUrlsWithHistoryVisits(hrefs);
    if (matches.length === 0) {
      await cleanupHistoryHighlights(tabId);
    } else {
      try {
        await chrome.scripting.executeScript({
          args: [plan.color, matches],
          func: applyHistoryHighlightColor,
          target: { tabId },
          world: "MAIN",
        });
      } catch {}
    }
  } else {
    await cleanupHistoryHighlights(tabId);
  }
}
