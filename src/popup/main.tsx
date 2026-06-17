import { createRoot } from "react-dom/client";

import "@/global.css";
import {
  defaultHostSiteSettings,
  loadHostSiteSettingsModel,
} from "@/preferences/host-site-settings";
import { loadReviewPromptShouldShow } from "@/preferences/review-prompt-local";
import {
  defaultExtensionSyncedOptions,
  loadExtensionSyncedOptions,
} from "@/preferences/synced-options";

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

async function loadPopupBootstrap() {
  const hostnamePromise = activeTabHostname();
  const [
    initialHostname,
    initialSyncedOptions,
    initialShowReviewPrompt,
    { settings: initialHostSettings },
  ] = await Promise.all([
    hostnamePromise,
    loadExtensionSyncedOptions(),
    loadReviewPromptShouldShow(),
    hostnamePromise.then((hostname) =>
      loadHostSiteSettingsModel(hostname ?? ""),
    ),
  ]);
  return {
    initialHostSettings,
    initialHostname,
    initialShowReviewPrompt,
    initialSyncedOptions,
  };
}

const root = createRoot(el);
root.render(
  <App
    key="boot"
    initialHostSettings={defaultHostSiteSettings}
    initialHostname={null}
    initialShowReviewPrompt={false}
    initialSyncedOptions={defaultExtensionSyncedOptions}
  />,
);

void loadPopupBootstrap().then((bootstrap) => {
  root.render(<App key="ready" {...bootstrap} />);
});
