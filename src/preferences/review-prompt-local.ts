const LOCAL_KEYS = {
  installAt: "vl_installAt",
  never: "vl_reviewNever",
  snoozeUntil: "vl_reviewSnoozeUntil",
} as const;

const MS_PER_DAY = 86400000;
const SHOW_AFTER_MS = 7 * MS_PER_DAY;
const SNOOZE_MS = 3 * MS_PER_DAY;

const CHROME_WEB_STORE_REVIEWS_URL =
  "https://chromewebstore.google.com/detail/visitmark-highlight-visit/mnmjcjjobghnhfklnijgjcmodgfnceek/reviews";

export function installReviewInstallTracking(): void {
  chrome.runtime.onInstalled.addListener((d) => {
    if (d.reason === "install") {
      void chrome.storage.local.set({
        [LOCAL_KEYS.installAt]: Date.now(),
      });
    }
  });
  void chrome.storage.local.get(LOCAL_KEYS.installAt).then((r) => {
    if (typeof r[LOCAL_KEYS.installAt] !== "number") {
      void chrome.storage.local.set({
        [LOCAL_KEYS.installAt]: Date.now(),
      });
    }
  });
}

export async function loadReviewPromptShouldShow(): Promise<boolean> {
  const r = await chrome.storage.local.get([
    LOCAL_KEYS.installAt,
    LOCAL_KEYS.never,
    LOCAL_KEYS.snoozeUntil,
  ]);
  if (r[LOCAL_KEYS.never] === true) {
    return false;
  }
  const installAt = r[LOCAL_KEYS.installAt];
  if (typeof installAt !== "number") {
    return false;
  }
  const now = Date.now();
  if (now < installAt + SHOW_AFTER_MS) {
    return false;
  }
  const snooze = r[LOCAL_KEYS.snoozeUntil];
  if (typeof snooze === "number" && now < snooze) {
    return false;
  }
  return true;
}

export async function persistReviewSnooze(): Promise<void> {
  await chrome.storage.local.set({
    [LOCAL_KEYS.snoozeUntil]: Date.now() + SNOOZE_MS,
  });
}

export async function persistReviewNeverAskAgain(): Promise<void> {
  await chrome.storage.local.set({
    [LOCAL_KEYS.never]: true,
  });
}

export function chromeWebStoreReviewsUrl(): string {
  return CHROME_WEB_STORE_REVIEWS_URL;
}
