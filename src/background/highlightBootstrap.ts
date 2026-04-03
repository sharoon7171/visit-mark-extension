import {
  defaultHostSiteSettings,
  loadPerHostSiteSettingsMap,
  type HostSiteSettings,
} from "@/extension-host-settings";
import {
  loadExtensionSyncedOptions,
  type ExtensionSyncedOptions,
} from "@/extension-options-sync";

type TabHighlightPlan = {
  active: boolean;
  color: string;
  historyHighlight: boolean;
  visitedCss: boolean;
};

export function isInjectablePageUrl(url: string): boolean {
  try {
    const p = new URL(url).protocol;
    return p === "http:" || p === "https:";
  } catch {
    return false;
  }
}

export async function loadHighlightBootstrap(): Promise<{
  hostMap: Record<string, HostSiteSettings>;
  synced: ExtensionSyncedOptions;
}> {
  const [synced, hostMap] = await Promise.all([
    loadExtensionSyncedOptions(),
    loadPerHostSiteSettingsMap(),
  ]);
  return { hostMap, synced };
}

export function planHighlightForPageUrl(
  pageUrl: string,
  synced: ExtensionSyncedOptions,
  hostMap: Record<string, HostSiteSettings>,
): TabHighlightPlan | null {
  let hostname: string;
  try {
    hostname = new URL(pageUrl).hostname;
  } catch {
    return null;
  }
  const host = hostMap[hostname] ?? defaultHostSiteSettings;
  const active = synced.masterEnabled && host.siteColorsEnabled;
  let color = synced.defaultHighlightColor;
  if (active && host.customHighlightEnabled && host.highlightColor) {
    color = host.highlightColor;
  }
  return {
    active,
    color,
    historyHighlight: active && synced.highlightHistoryLinksEnabled,
    visitedCss: active && synced.highlightVisitedCssEnabled,
  };
}
