import { DEFAULT_VISITED_HEX, parseHexColor } from "@/lib/hexColor";

export type ExtensionSyncedOptions = {
  masterEnabled: boolean;
  defaultHighlightColor: string;
};

export const EXTENSION_SYNC_OPTION_KEYS = {
  masterEnabled: "vl_masterEnabled",
  defaultHighlightColor: "vl_defaultHighlightColor",
} as const;

const STORAGE_KEYS = EXTENSION_SYNC_OPTION_KEYS;

const LEGACY_SITE_KEYS = {
  siteEnabled: "vl_siteEnabled",
  siteHighlightColor: "vl_siteHighlightColor",
} as const;

const DEFAULTS: ExtensionSyncedOptions = {
  masterEnabled: true,
  defaultHighlightColor: DEFAULT_VISITED_HEX,
};

function fromRecord(raw: Record<string, unknown>): ExtensionSyncedOptions {
  const m = raw[STORAGE_KEYS.masterEnabled];
  return {
    masterEnabled: typeof m === "boolean" ? m : DEFAULTS.masterEnabled,
    defaultHighlightColor: parseHexColor(
      raw[STORAGE_KEYS.defaultHighlightColor],
      DEFAULTS.defaultHighlightColor,
    ),
  };
}

export async function loadExtensionSyncedOptions(): Promise<ExtensionSyncedOptions> {
  const stored = await chrome.storage.sync.get(Object.values(STORAGE_KEYS));
  return fromRecord(stored as Record<string, unknown>);
}

export async function resetExtensionSyncedOptionsToDefaults(): Promise<void> {
  await chrome.storage.sync.set({
    [STORAGE_KEYS.masterEnabled]: DEFAULTS.masterEnabled,
    [STORAGE_KEYS.defaultHighlightColor]: DEFAULTS.defaultHighlightColor,
  });
}

export async function persistExtensionSyncedOptions(
  partial: Partial<ExtensionSyncedOptions>,
): Promise<void> {
  const payload: Record<string, boolean | string> = {};
  if (partial.masterEnabled !== undefined) {
    payload[STORAGE_KEYS.masterEnabled] = partial.masterEnabled;
  }
  if (partial.defaultHighlightColor !== undefined) {
    payload[STORAGE_KEYS.defaultHighlightColor] = partial.defaultHighlightColor;
  }
  if (Object.keys(payload).length > 0) {
    await chrome.storage.sync.set(payload);
  }
}

export async function readLegacySiteSyncDefaults(): Promise<{
  siteEnabled: boolean;
  siteHighlightColor: string;
}> {
  const raw = await chrome.storage.sync.get(Object.values(LEGACY_SITE_KEYS));
  const rec = raw as Record<string, unknown>;
  const s = rec[LEGACY_SITE_KEYS.siteEnabled];
  return {
    siteEnabled: typeof s === "boolean" ? s : false,
    siteHighlightColor: parseHexColor(
      rec[LEGACY_SITE_KEYS.siteHighlightColor],
      DEFAULT_VISITED_HEX,
    ),
  };
}

export function subscribeExtensionSyncedOptions(
  onUpdate: (
    next: ExtensionSyncedOptions,
    changedOptionKeys: string[],
  ) => void,
): () => void {
  const optionKeySet = new Set<string>(Object.values(STORAGE_KEYS));
  const watched = [
    ...Object.values(STORAGE_KEYS),
    ...Object.values(LEGACY_SITE_KEYS),
  ];
  const handler: Parameters<typeof chrome.storage.onChanged.addListener>[0] = (
    changes,
    area,
  ) => {
    if (area !== "sync" || !watched.some((k) => changes[k])) {
      return;
    }
    const changedOptionKeys = Object.keys(changes).filter((k) =>
      optionKeySet.has(k),
    );
    if (changedOptionKeys.length === 0) {
      return;
    }
    void loadExtensionSyncedOptions().then((next) => {
      onUpdate(next, changedOptionKeys);
    });
  };
  chrome.storage.onChanged.addListener(handler);
  return () => chrome.storage.onChanged.removeListener(handler);
}
