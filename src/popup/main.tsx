import { createRoot } from "react-dom/client";

import "@/global.css";
import { loadHostSiteSettingsModel } from "@/preferences/host-site-settings";
import { loadReviewPromptShouldShow } from "@/preferences/review-prompt-local";
import { loadExtensionSyncedOptions } from "@/preferences/synced-options";

import { App } from "./App";

const el = document.getElementById("root");
if (!el) {
  throw new Error("root missing");
}

async function activeTabHostname(): Promise<string | null> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tabs[0]?.url;
  if (!url) return null;
  try {
    const h = new URL(url).hostname;
    return h || null;
  } catch {
    return null;
  }
}

void (async () => {
  try {
    await document.fonts.ready;
  } catch {}
  const initialHostname = await activeTabHostname();
  const initialSyncedOptions = await loadExtensionSyncedOptions();
  const initialShowReviewPrompt = await loadReviewPromptShouldShow();
  const { settings: initialHostSettings } = await loadHostSiteSettingsModel(
    initialHostname ?? "",
  );
  createRoot(el).render(
    <App
      initialHostSettings={initialHostSettings}
      initialHostname={initialHostname}
      initialShowReviewPrompt={initialShowReviewPrompt}
      initialSyncedOptions={initialSyncedOptions}
    />,
  );
})();
