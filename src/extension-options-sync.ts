import { DEFAULT_VISITED_HEX, parseHexColor } from "@/lib/hexColor";

export const EXTENSION_SYNC_OPTION_KEYS = {
  defaultHighlightColor: "vl_defaultHighlightColor",
  highlightHistoryLinksEnabled: "vl_highlightHistoryLinksEnabled",
  highlightVisitedCssEnabled: "vl_highlightVisitedCssEnabled",
  masterEnabled: "vl_masterEnabled",
} as const;

export type ExtensionSyncedOptions = {
  defaultHighlightColor: string;
  highlightHistoryLinksEnabled: boolean;
  highlightVisitedCssEnabled: boolean;
  masterEnabled: boolean;
};

const DEFAULTS: ExtensionSyncedOptions = {
  defaultHighlightColor: DEFAULT_VISITED_HEX,
  highlightHistoryLinksEnabled: true,
  highlightVisitedCssEnabled: true,
  masterEnabled: true,
};

const SYNC_KEYS = Object.values(EXTENSION_SYNC_OPTION_KEYS);
const SYNC_KEY_SET = new Set<string>(SYNC_KEYS);

function fromRecord(raw: Record<string, unknown>): ExtensionSyncedOptions {
  const m = raw[EXTENSION_SYNC_OPTION_KEYS.masterEnabled];
  const colorRaw = parseHexColor(
    raw[EXTENSION_SYNC_OPTION_KEYS.defaultHighlightColor],
  );
  const vcss = raw[EXTENSION_SYNC_OPTION_KEYS.highlightVisitedCssEnabled];
  const hist = raw[EXTENSION_SYNC_OPTION_KEYS.highlightHistoryLinksEnabled];
  return {
    defaultHighlightColor: colorRaw ?? DEFAULTS.defaultHighlightColor,
    highlightHistoryLinksEnabled:
      typeof hist === "boolean" ? hist : DEFAULTS.highlightHistoryLinksEnabled,
    highlightVisitedCssEnabled:
      typeof vcss === "boolean" ? vcss : DEFAULTS.highlightVisitedCssEnabled,
    masterEnabled: typeof m === "boolean" ? m : DEFAULTS.masterEnabled,
  };
}

export function extensionOptionsAreDefaults(
  o: ExtensionSyncedOptions,
): boolean {
  return (
    o.defaultHighlightColor === DEFAULTS.defaultHighlightColor &&
    o.highlightHistoryLinksEnabled === DEFAULTS.highlightHistoryLinksEnabled &&
    o.highlightVisitedCssEnabled === DEFAULTS.highlightVisitedCssEnabled &&
    o.masterEnabled === DEFAULTS.masterEnabled
  );
}

export async function loadExtensionSyncedOptions(): Promise<ExtensionSyncedOptions> {
  const stored = await chrome.storage.sync.get(SYNC_KEYS);
  return fromRecord(stored as Record<string, unknown>);
}

export async function persistExtensionSyncedOptions(
  o: ExtensionSyncedOptions,
): Promise<void> {
  await chrome.storage.sync.set({
    [EXTENSION_SYNC_OPTION_KEYS.defaultHighlightColor]: o.defaultHighlightColor,
    [EXTENSION_SYNC_OPTION_KEYS.highlightHistoryLinksEnabled]:
      o.highlightHistoryLinksEnabled,
    [EXTENSION_SYNC_OPTION_KEYS.highlightVisitedCssEnabled]:
      o.highlightVisitedCssEnabled,
    [EXTENSION_SYNC_OPTION_KEYS.masterEnabled]: o.masterEnabled,
  });
}

export async function resetExtensionSyncedOptionsToDefaults(): Promise<void> {
  await chrome.storage.sync.set({
    [EXTENSION_SYNC_OPTION_KEYS.defaultHighlightColor]:
      DEFAULTS.defaultHighlightColor,
    [EXTENSION_SYNC_OPTION_KEYS.highlightHistoryLinksEnabled]:
      DEFAULTS.highlightHistoryLinksEnabled,
    [EXTENSION_SYNC_OPTION_KEYS.highlightVisitedCssEnabled]:
      DEFAULTS.highlightVisitedCssEnabled,
    [EXTENSION_SYNC_OPTION_KEYS.masterEnabled]: DEFAULTS.masterEnabled,
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
