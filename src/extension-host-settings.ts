import { readLegacySiteSyncDefaults } from "@/extension-options-sync";
import { DEFAULT_VISITED_HEX, parseHexColor } from "@/lib/hexColor";

export type HostSiteSettings = {
  overrideEnabled: boolean;
  highlightColor: string | null;
};

const STORAGE_KEY = "vl_perHost";
const LEGACY_SYNC = ["vl_siteEnabled", "vl_siteHighlightColor"] as const;

const DEFAULT_HOST: HostSiteSettings = {
  overrideEnabled: false,
  highlightColor: null,
};

function parseHostEntry(raw: unknown): HostSiteSettings {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_HOST };
  }
  const o = raw as Record<string, unknown>;
  let highlightColor: string | null = null;
  if ("highlightColor" in o) {
    const v = o.highlightColor;
    if (v !== null && v !== undefined && v !== "") {
      highlightColor = parseHexColor(v, DEFAULT_VISITED_HEX);
    }
  }
  return {
    overrideEnabled:
      typeof o.overrideEnabled === "boolean" ? o.overrideEnabled : false,
    highlightColor,
  };
}

async function loadMap(): Promise<Record<string, HostSiteSettings>> {
  const raw = (await chrome.storage.local.get(STORAGE_KEY))[STORAGE_KEY];
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

export async function loadHostSiteSettings(
  hostname: string,
): Promise<HostSiteSettings> {
  if (!hostname) {
    return { ...DEFAULT_HOST };
  }
  const map = await loadMap();
  return map[hostname] ?? { ...DEFAULT_HOST };
}

export async function migrateLegacySiteKeysForHost(
  hostname: string | null,
): Promise<void> {
  const raw = await chrome.storage.sync.get([...LEGACY_SYNC]);
  if (!raw.vl_siteEnabled && !raw.vl_siteHighlightColor) {
    return;
  }
  if (!hostname) {
    return;
  }
  const map = await loadMap();
  if (map[hostname] === undefined) {
    const legacy = await readLegacySiteSyncDefaults();
    await persistHostSiteSettings(hostname, {
      overrideEnabled: legacy.siteEnabled,
      highlightColor: legacy.siteHighlightColor,
    });
  }
  await chrome.storage.sync.remove([...LEGACY_SYNC]);
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
  await chrome.storage.local.set({ [STORAGE_KEY]: map });
}

export async function persistHostSiteSettings(
  hostname: string,
  partial: Partial<HostSiteSettings>,
): Promise<void> {
  if (!hostname) {
    return;
  }
  const map = await loadMap();
  const prev = map[hostname] ?? { ...DEFAULT_HOST };
  map[hostname] = {
    overrideEnabled:
      partial.overrideEnabled !== undefined
        ? partial.overrideEnabled
        : prev.overrideEnabled,
    highlightColor:
      partial.highlightColor !== undefined
        ? partial.highlightColor
        : prev.highlightColor,
  };
  await chrome.storage.local.set({ [STORAGE_KEY]: map });
}
