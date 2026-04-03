import { EXTENSION_SYNC_OPTION_KEYS } from "@/extension-options-sync";
import { VISITMARK_REFRESH_HIGHLIGHTS } from "@/lib/highlightRefreshMessage";

import { loadHighlightBootstrap } from "./highlightBootstrap";
import {
  applyHighlightToTab,
  forgetTabHighlightTracking,
} from "./visitedTabApply";

const RELEVANT_STORAGE_KEYS = new Set<string>([
  ...Object.values(EXTENSION_SYNC_OPTION_KEYS),
  "vl_perHost",
]);

async function refreshAllHighlightTabs(): Promise<void> {
  const { hostMap, synced } = await loadHighlightBootstrap();
  const tabs = await chrome.tabs.query({});
  await Promise.all(
    tabs.map((t) =>
      t.id == null
        ? Promise.resolve()
        : applyHighlightToTab(t.id, t, synced, hostMap),
    ),
  );
}

export function installVisitedLinkHighlighting(): void {
  chrome.history.onVisitRemoved.addListener(() => {
    void refreshAllHighlightTabs();
  });

  chrome.history.onVisited.addListener(() => {
    void refreshAllHighlightTabs();
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (
      message &&
      typeof message === "object" &&
      (message as { type?: string }).type === VISITMARK_REFRESH_HIGHLIGHTS
    ) {
      void refreshAllHighlightTabs();
    }
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync") {
      return;
    }
    if (!Object.keys(changes).some((k) => RELEVANT_STORAGE_KEYS.has(k))) {
      return;
    }
    void refreshAllHighlightTabs();
  });

  chrome.tabs.onActivated.addListener(({ tabId }) => {
    void (async () => {
      try {
        const tab = await chrome.tabs.get(tabId);
        const { hostMap, synced } = await loadHighlightBootstrap();
        await applyHighlightToTab(tabId, tab, synced, hostMap);
      } catch {}
    })();
  });

  chrome.tabs.onRemoved.addListener((tabId) => {
    forgetTabHighlightTracking(tabId);
  });

  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status !== "complete" || !tab.url) {
      return;
    }
    void (async () => {
      const { hostMap, synced } = await loadHighlightBootstrap();
      await applyHighlightToTab(tabId, tab, synced, hostMap);
    })();
  });

  chrome.webNavigation.onHistoryStateUpdated.addListener((d) => {
    if (d.frameId !== 0) {
      return;
    }
    void (async () => {
      try {
        const tab = await chrome.tabs.get(d.tabId);
        const { hostMap, synced } = await loadHighlightBootstrap();
        await applyHighlightToTab(d.tabId, tab, synced, hostMap);
      } catch {}
    })();
  });

  void refreshAllHighlightTabs();
}
