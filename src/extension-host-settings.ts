import {
  type ExtensionSyncedOptions,
  EXTENSION_SYNC_OPTION_KEYS,
} from "@/extension-options-sync";
import { parseHexColor } from "@/lib/hexColor";

export type HostSiteSettings = {
  overrideEnabled: boolean;
  highlightColor: string | null;
};

const STORAGE_KEY = "vl_perHost";

const DEFAULT_HOST: HostSiteSettings = {
  overrideEnabled: false,
  highlightColor: null,
};

function parseHostEntry(raw: unknown): HostSiteSettings {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_HOST };
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
  return {
    overrideEnabled:
      typeof o.overrideEnabled === "boolean" ? o.overrideEnabled : false,
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

async function loadMap(): Promise<Record<string, HostSiteSettings>> {
  const syncBag = await chrome.storage.sync.get(STORAGE_KEY);
  return parseMap(syncBag[STORAGE_KEY]);
}

function hostSiteSettingsEqual(a: HostSiteSettings, b: HostSiteSettings): boolean {
  return (
    a.overrideEnabled === b.overrideEnabled &&
    a.highlightColor === b.highlightColor
  );
}

export async function loadHostSiteSettings(
  hostname: string,
): Promise<HostSiteSettings> {
  if (!hostname) {
    return { ...DEFAULT_HOST };
  }
  const map = await loadMap();
  const entry = map[hostname];
  if (!entry) {
    return { ...DEFAULT_HOST };
  }
  return { ...entry };
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
  if (
    cg.masterEnabled !== ig.masterEnabled ||
    cg.defaultHighlightColor !== ig.defaultHighlightColor
  ) {
    payload[EXTENSION_SYNC_OPTION_KEYS.masterEnabled] = cg.masterEnabled;
    payload[EXTENSION_SYNC_OPTION_KEYS.defaultHighlightColor] =
      cg.defaultHighlightColor;
  }
  if (
    input.hostname &&
    !hostSiteSettingsEqual(input.initialHost, input.currentHost)
  ) {
    const map = await loadMap();
    map[input.hostname] = {
      overrideEnabled: input.currentHost.overrideEnabled,
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
  const map = await loadMap();
  if (!(hostname in map)) {
    return;
  }
  delete map[hostname];
  await chrome.storage.sync.set({ [STORAGE_KEY]: map });
}
