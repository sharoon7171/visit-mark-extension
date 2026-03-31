import {
  EXTENSION_SYNC_OPTION_KEYS,
  type ExtensionSyncedOptions,
} from "@/extension-options-sync";
import {
  visitTargetTogglesEqual,
  type VisitTargetToggles,
} from "@/visited-link-targets";
import { parseHexColor } from "@/lib/hexColor";

export type HostSiteSettings = {
  siteColorsEnabled: boolean;
  customHighlightEnabled: boolean;
  highlightColor: string | null;
};

const STORAGE_KEY = "vl_perHost";

export const defaultHostSiteSettings: HostSiteSettings = {
  siteColorsEnabled: true,
  customHighlightEnabled: false,
  highlightColor: null,
};

function parseHostEntry(raw: unknown): HostSiteSettings {
  if (!raw || typeof raw !== "object") {
    return { ...defaultHostSiteSettings };
  }
  const o = raw as Record<string, unknown>;
  const v = o.highlightColor;
  let highlightColor: string | null = null;
  if (v !== null && v !== undefined && v !== "") {
    const parsed = parseHexColor(v);
    if (parsed !== null) {
      highlightColor = parsed;
    }
  }
  let siteColorsEnabled = defaultHostSiteSettings.siteColorsEnabled;
  if (typeof o.siteColorsEnabled === "boolean") {
    siteColorsEnabled = o.siteColorsEnabled;
  } else if (typeof o.overrideEnabled === "boolean") {
    siteColorsEnabled = o.overrideEnabled;
  }
  let customHighlightEnabled = defaultHostSiteSettings.customHighlightEnabled;
  if (typeof o.customHighlightEnabled === "boolean") {
    customHighlightEnabled = o.customHighlightEnabled;
  } else if (highlightColor !== null) {
    customHighlightEnabled = true;
  }
  if (customHighlightEnabled && highlightColor === null) {
    customHighlightEnabled = false;
  }
  return {
    siteColorsEnabled,
    customHighlightEnabled,
    highlightColor,
  };
}

function parseMap(raw: unknown): Record<string, HostSiteSettings> {
  if (!raw || typeof raw !== "object") {
    return {};
  }
  const out: Record<string, HostSiteSettings> = {};
  for (const [host, entry] of Object.entries(raw as Record<string, unknown>)) {
    if (host) {
      out[host] = parseHostEntry(entry);
    }
  }
  return out;
}

function stripLegacyFollowGlobalEntries(raw: Record<string, unknown>): {
  next: Record<string, unknown>;
  changed: boolean;
} {
  const next: Record<string, unknown> = { ...raw };
  let changed = false;
  for (const [host, entry] of Object.entries(next)) {
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const e = entry as Record<string, unknown>;
    if (
      typeof e.siteColorsEnabled !== "boolean" &&
      e.overrideEnabled === false
    ) {
      delete next[host];
      changed = true;
    }
  }
  return { next, changed };
}

export async function loadPerHostSiteSettingsMap(): Promise<
  Record<string, HostSiteSettings>
> {
  const syncBag = await chrome.storage.sync.get(STORAGE_KEY);
  const rawRoot = syncBag[STORAGE_KEY];
  if (!rawRoot || typeof rawRoot !== "object") {
    return {};
  }
  const rawObj = rawRoot as Record<string, unknown>;
  const { next, changed } = stripLegacyFollowGlobalEntries(rawObj);
  if (changed) {
    await chrome.storage.sync.set({ [STORAGE_KEY]: next });
  }
  return parseMap(next);
}

export async function persistHostSiteSettings(
  hostname: string,
  settings: HostSiteSettings,
): Promise<void> {
  if (!hostname) {
    return;
  }
  const map = await loadPerHostSiteSettingsMap();
  map[hostname] = {
    customHighlightEnabled: settings.customHighlightEnabled,
    highlightColor: settings.highlightColor,
    siteColorsEnabled: settings.siteColorsEnabled,
  };
  await chrome.storage.sync.set({ [STORAGE_KEY]: map });
}

function hostSiteSettingsEqual(a: HostSiteSettings, b: HostSiteSettings): boolean {
  return (
    a.siteColorsEnabled === b.siteColorsEnabled &&
    a.customHighlightEnabled === b.customHighlightEnabled &&
    a.highlightColor === b.highlightColor
  );
}

export function hostSiteSettingsAreDefaults(s: HostSiteSettings): boolean {
  return hostSiteSettingsEqual(s, defaultHostSiteSettings);
}

type HostSiteSettingsModel = {
  settings: HostSiteSettings;
  persisted: boolean;
};

export async function loadHostSiteSettingsModel(
  hostname: string,
): Promise<HostSiteSettingsModel> {
  if (!hostname) {
    return {
      settings: { ...defaultHostSiteSettings },
      persisted: false,
    };
  }
  const map = await loadPerHostSiteSettingsMap();
  const entry = map[hostname];
  if (entry) {
    return { settings: { ...entry }, persisted: true };
  }
  return { settings: { ...defaultHostSiteSettings }, persisted: false };
}

export type PopupSyncFlushPayload = {
  hostname: string | null;
  initialGlobal: ExtensionSyncedOptions;
  currentGlobal: ExtensionSyncedOptions;
  initialHost: HostSiteSettings;
  currentHost: HostSiteSettings;
};

export async function flushPopupSyncedState(
  input: PopupSyncFlushPayload,
): Promise<void> {
  const payload: Record<
    string,
    boolean | string | VisitTargetToggles | Record<string, HostSiteSettings>
  > = {};
  const cg = input.currentGlobal;
  const ig = input.initialGlobal;
  if (
    cg.masterEnabled !== ig.masterEnabled ||
    cg.defaultHighlightColor !== ig.defaultHighlightColor ||
    cg.highlightHistoryLinksEnabled !== ig.highlightHistoryLinksEnabled ||
    cg.highlightVisitedCssEnabled !== ig.highlightVisitedCssEnabled ||
    !visitTargetTogglesEqual(cg.visitTargetToggles, ig.visitTargetToggles)
  ) {
    payload[EXTENSION_SYNC_OPTION_KEYS.masterEnabled] = cg.masterEnabled;
    payload[EXTENSION_SYNC_OPTION_KEYS.defaultHighlightColor] =
      cg.defaultHighlightColor;
    payload[EXTENSION_SYNC_OPTION_KEYS.highlightHistoryLinksEnabled] =
      cg.highlightHistoryLinksEnabled;
    payload[EXTENSION_SYNC_OPTION_KEYS.highlightVisitedCssEnabled] =
      cg.highlightVisitedCssEnabled;
    payload[EXTENSION_SYNC_OPTION_KEYS.visitTargetToggles] =
      cg.visitTargetToggles;
  }
  if (
    input.hostname &&
    !hostSiteSettingsEqual(input.initialHost, input.currentHost)
  ) {
    const map = await loadPerHostSiteSettingsMap();
    map[input.hostname] = {
      siteColorsEnabled: input.currentHost.siteColorsEnabled,
      customHighlightEnabled: input.currentHost.customHighlightEnabled,
      highlightColor: input.currentHost.highlightColor,
    };
    payload[STORAGE_KEY] = map;
  }
  if (Object.keys(payload).length > 0) {
    await chrome.storage.sync.set(payload);
  }
}

export async function clearHostSiteSettings(hostname: string): Promise<void> {
  if (!hostname) {
    return;
  }
  const map = await loadPerHostSiteSettingsMap();
  if (!(hostname in map)) {
    return;
  }
  delete map[hostname];
  await chrome.storage.sync.set({ [STORAGE_KEY]: map });
}
