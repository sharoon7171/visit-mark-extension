import type { HostSiteSettings } from "@/extension-host-settings";
import type { ExtensionSyncedOptions } from "@/extension-options-sync";

import { isInjectablePageUrl, planHighlightForPageUrl } from "./highlightBootstrap";
import { listNormalizedUrlsWithHistoryVisits } from "./historyVisitsLookup";
import {
  applyHistoryHighlightColor,
  clearHistoryHighlightsOnPage,
  collectAnchorHrefsFromPage,
} from "./pageScripts";
import {
  LEGACY_NEUTRALIZE_VISITED_LINK_CSS,
  buildVisitedLinkCss,
} from "./visitedLinkCss";

const injectedVisitedCssByTab = new Map<number, string>();

export function forgetTabHighlightTracking(tabId: number): void {
  injectedVisitedCssByTab.delete(tabId);
}

async function removeVisitedCss(tabId: number): Promise<void> {
  const prev = injectedVisitedCssByTab.get(tabId);
  if (!prev) {
    return;
  }
  try {
    await chrome.scripting.removeCSS({ css: prev, target: { tabId } });
  } catch {}
  injectedVisitedCssByTab.delete(tabId);
}

async function applyInjectedCss(tabId: number, css: string): Promise<void> {
  const prev = injectedVisitedCssByTab.get(tabId);
  if (prev === css) {
    return;
  }
  if (prev) {
    try {
      await chrome.scripting.removeCSS({ css: prev, target: { tabId } });
    } catch {}
  }
  try {
    await chrome.scripting.insertCSS({ css, target: { tabId } });
    injectedVisitedCssByTab.set(tabId, css);
  } catch {}
}

async function cleanupHistoryHighlights(tabId: number): Promise<void> {
  try {
    await chrome.scripting.executeScript({
      func: clearHistoryHighlightsOnPage,
      target: { tabId },
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
    await removeVisitedCss(tabId);
    await cleanupHistoryHighlights(tabId);
    return;
  }
  const plan = planHighlightForPageUrl(url, synced, hostMap);
  if (!plan) {
    await removeVisitedCss(tabId);
    await cleanupHistoryHighlights(tabId);
    return;
  }
  if (!plan.active) {
    await removeVisitedCss(tabId);
    try {
      await chrome.scripting.removeCSS({
        css: LEGACY_NEUTRALIZE_VISITED_LINK_CSS,
        target: { tabId },
      });
    } catch {}
  } else if (plan.visitedCss) {
    await applyInjectedCss(tabId, buildVisitedLinkCss(plan.color));
  } else {
    await removeVisitedCss(tabId);
  }
  if (plan.historyHighlight) {
    let hrefs: string[] = [];
    try {
      const [res] = await chrome.scripting.executeScript({
        func: collectAnchorHrefsFromPage,
        target: { tabId },
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
        });
      } catch {}
    }
  } else {
    await cleanupHistoryHighlights(tabId);
  }
}
