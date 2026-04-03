import {
  EXTENSION_SYNC_OPTION_KEYS,
  type ExtensionSyncedOptions,
} from "@/extension-options-sync";
import { parseHexColor } from "@/lib/hexColor";

export type HostSiteSettings = {
  customHighlightEnabled: boolean;
  highlightColor: string | null;
  siteColorsEnabled: boolean;
};

const STORAGE_KEY = "vl_perHost";

export const defaultHostSiteSettings: HostSiteSettings = {
  customHighlightEnabled: false,
  highlightColor: null,
  siteColorsEnabled: true,
};

function hostSiteSettingsEqual(a: HostSiteSettings, b: HostSiteSettings): boolean {
  return (
    a.customHighlightEnabled === b.customHighlightEnabled &&
    a.highlightColor === b.highlightColor &&
    a.siteColorsEnabled === b.siteColorsEnabled
  );
}

export function hostSiteSettingsAreDefaults(s: HostSiteSettings): boolean {
  return hostSiteSettingsEqual(s, defaultHostSiteSettings);
}

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
    customHighlightEnabled,
    highlightColor,
    siteColorsEnabled,
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

function stripRedundantDefaultHostEntries(raw: Record<string, unknown>): {
  next: Record<string, unknown>;
  changed: boolean;
} {
  const next: Record<string, unknown> = { ...raw };
  let changed = false;
  for (const [host, entry] of Object.entries(next)) {
    if (hostSiteSettingsAreDefaults(parseHostEntry(entry))) {
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
  const strippedLegacy = stripLegacyFollowGlobalEntries(rawObj);
  const strippedDefaults = stripRedundantDefaultHostEntries(strippedLegacy.next);
  const next = strippedDefaults.next;
  if (strippedLegacy.changed || strippedDefaults.changed) {
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
  if (hostSiteSettingsAreDefaults(settings)) {
    if (hostname in map) {
      delete map[hostname];
      await chrome.storage.sync.set({ [STORAGE_KEY]: map });
    }
    return;
  }
  map[hostname] = {
    customHighlightEnabled: settings.customHighlightEnabled,
    highlightColor: settings.highlightColor,
    siteColorsEnabled: settings.siteColorsEnabled,
  };
  await chrome.storage.sync.set({ [STORAGE_KEY]: map });
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
    boolean | string | Record<string, HostSiteSettings>
  > = {};
  const cg = input.currentGlobal;
  const ig = input.initialGlobal;
  if (cg.defaultHighlightColor !== ig.defaultHighlightColor) {
    payload[EXTENSION_SYNC_OPTION_KEYS.defaultHighlightColor] =
      cg.defaultHighlightColor;
  }
  if (
    input.hostname &&
    input.currentHost.highlightColor !== input.initialHost.highlightColor
  ) {
    const map = await loadPerHostSiteSettingsMap();
    const merged: HostSiteSettings = {
      customHighlightEnabled: input.currentHost.customHighlightEnabled,
      highlightColor: input.currentHost.highlightColor,
      siteColorsEnabled: input.currentHost.siteColorsEnabled,
    };
    if (hostSiteSettingsAreDefaults(merged)) {
      delete map[input.hostname];
    } else {
      map[input.hostname] = merged;
    }
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
