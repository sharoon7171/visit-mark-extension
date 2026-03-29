import "@fontsource/poppins/latin-500.css";
import "@fontsource/poppins/latin-600.css";
import "@fontsource/poppins/latin-700.css";
import { createRoot } from "react-dom/client";

import "@/global.css";
import { loadHostSiteSettings } from "@/extension-host-settings";
import { loadExtensionSyncedOptions } from "@/extension-options-sync";
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
  const [initialSyncedOptions, initialHostSettings] = await Promise.all([
    loadExtensionSyncedOptions(),
    loadHostSiteSettings(initialHostname ?? ""),
  ]);
  createRoot(el).render(
    <App
      initialSyncedOptions={initialSyncedOptions}
      initialHostname={initialHostname}
      initialHostSettings={initialHostSettings}
    />,
  );
})();
