import { DEFAULT_VISITED_HEX, parseHexColor } from "@/lib/hexColor";

export type ExtensionSyncedOptions = {
  masterEnabled: boolean;
  defaultHighlightColor: string;
};

export const EXTENSION_SYNC_OPTION_KEYS = {
  masterEnabled: "vl_masterEnabled",
  defaultHighlightColor: "vl_defaultHighlightColor",
} as const;

const DEFAULTS: ExtensionSyncedOptions = {
  masterEnabled: true,
  defaultHighlightColor: DEFAULT_VISITED_HEX,
};

const SYNC_KEYS = Object.values(EXTENSION_SYNC_OPTION_KEYS);
const SYNC_KEY_SET = new Set<string>(SYNC_KEYS);

function fromRecord(raw: Record<string, unknown>): ExtensionSyncedOptions {
  const m = raw[EXTENSION_SYNC_OPTION_KEYS.masterEnabled];
  const colorRaw = parseHexColor(
    raw[EXTENSION_SYNC_OPTION_KEYS.defaultHighlightColor],
  );
  return {
    masterEnabled: typeof m === "boolean" ? m : DEFAULTS.masterEnabled,
    defaultHighlightColor: colorRaw ?? DEFAULTS.defaultHighlightColor,
  };
}

export async function loadExtensionSyncedOptions(): Promise<ExtensionSyncedOptions> {
  const stored = await chrome.storage.sync.get(SYNC_KEYS);
  return fromRecord(stored as Record<string, unknown>);
}

export async function resetExtensionSyncedOptionsToDefaults(): Promise<void> {
  await chrome.storage.sync.set({
    [EXTENSION_SYNC_OPTION_KEYS.masterEnabled]: DEFAULTS.masterEnabled,
    [EXTENSION_SYNC_OPTION_KEYS.defaultHighlightColor]:
      DEFAULTS.defaultHighlightColor,
  });
}

export function subscribeExtensionSyncedOptions(
  onUpdate: (
    next: ExtensionSyncedOptions,
    changedOptionKeys: string[],
  ) => void,
): () => void {
  const handler: Parameters<typeof chrome.storage.onChanged.addListener>[0] = (
    changes,
    area,
  ) => {
    if (area !== "sync" || !SYNC_KEYS.some((k) => changes[k])) {
      return;
    }
    const changedOptionKeys = Object.keys(changes).filter((k) =>
      SYNC_KEY_SET.has(k),
    );
    void loadExtensionSyncedOptions().then((next) => {
      onUpdate(next, changedOptionKeys);
    });
  };
  chrome.storage.onChanged.addListener(handler);
  return () => chrome.storage.onChanged.removeListener(handler);
}
