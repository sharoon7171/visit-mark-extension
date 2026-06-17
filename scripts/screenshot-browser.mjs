import { spawnSync } from "node:child_process";
import { existsSync, renameSync, unlinkSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { chromium } from "playwright";

export const CAPTURE_SIZE = { width: 1280, height: 800 };
const WINDOW = {
  left: 120,
  top: 80,
  width: CAPTURE_SIZE.width,
  height: CAPTURE_SIZE.height,
};

export function requireMacOS() {
  if (process.platform !== "darwin") {
    console.error("Real browser window capture requires macOS.");
    process.exit(1);
  }
}

export async function launchExtensionBrowser(extPath) {
  return chromium.launchPersistentContext(
    path.join(os.tmpdir(), `visitmark-screenshot-${Date.now()}`),
    {
      channel: "chromium",
      headless: false,
      viewport: { width: WINDOW.width, height: WINDOW.height - 88 },
      args: [
        `--disable-extensions-except=${extPath}`,
        `--load-extension=${extPath}`,
        `--window-size=${WINDOW.width},${WINDOW.height}`,
        `--window-position=${WINDOW.left},${WINDOW.top}`,
        "--force-device-scale-factor=1",
      ],
    },
  );
}

export async function getExtId(context) {
  let [sw] = context.serviceWorkers();
  if (!sw) {
    sw = await context.waitForEvent("serviceworker");
  }
  return sw.url().split("/")[2];
}

export async function injectVisitmarkStorage(page, global) {
  await page.evaluate(
    async (globalOptions) => {
      await chrome.storage.sync.set({
        vl_masterEnabled: globalOptions.masterEnabled,
        vl_defaultHighlightColor: globalOptions.defaultHighlightColor,
        vl_highlightVisitedCssEnabled: globalOptions.highlightVisitedCssEnabled,
        vl_highlightHistoryLinksEnabled: globalOptions.highlightHistoryLinksEnabled,
        vl_perHost: {},
      });
      await chrome.storage.local.set({ vl_reviewNever: true });
    },
    global,
  );
}

export async function closeOtherPages(context, keepPage) {
  await Promise.all(
    context.pages().filter((page) => page !== keepPage).map((page) => page.close()),
  );
}

function assertCaptureSize(targetPath) {
  const probe = spawnSync(
    "sips",
    ["-g", "pixelWidth", "-g", "pixelHeight", targetPath],
    { encoding: "utf8" },
  );
  const width = Number(probe.stdout.match(/pixelWidth: (\d+)/)?.[1] ?? 0);
  const height = Number(probe.stdout.match(/pixelHeight: (\d+)/)?.[1] ?? 0);

  if (width === CAPTURE_SIZE.width && height === CAPTURE_SIZE.height) {
    return;
  }

  if (
    width === CAPTURE_SIZE.width * 2 &&
    height === CAPTURE_SIZE.height * 2
  ) {
    const tmpPath = `${targetPath}.tmp.png`;
    const ffmpeg = spawnSync(
      "ffmpeg",
      [
        "-y",
        "-i",
        targetPath,
        "-vf",
        `scale=${CAPTURE_SIZE.width}:${CAPTURE_SIZE.height}:flags=lanczos`,
        tmpPath,
      ],
      { encoding: "utf8" },
    );
    if (ffmpeg.status === 0 && existsSync(tmpPath)) {
      renameSync(tmpPath, targetPath);
      return;
    }
    if (existsSync(tmpPath)) {
      unlinkSync(tmpPath);
    }
    spawnSync(
      "sips",
      [
        "-z",
        String(CAPTURE_SIZE.height),
        String(CAPTURE_SIZE.width),
        targetPath,
      ],
      { encoding: "utf8" },
    );
    return;
  }

  unlinkSync(targetPath);
  throw new Error(
    `Capture is ${width}x${height}, expected ${CAPTURE_SIZE.width}x${CAPTURE_SIZE.height}`,
  );
}

export async function snapBrowserWindow(page, targetPath) {
  const cdp = await page.context().newCDPSession(page);
  const { windowId } = await cdp.send("Browser.getWindowForTarget");
  await cdp.send("Browser.setWindowBounds", {
    windowId,
    bounds: { ...WINDOW, windowState: "normal" },
  });
  spawnSync(
    "osascript",
    [
      "-e",
      `tell application "System Events"
    repeat with procName in {"Google Chrome for Testing", "Chromium", "Google Chrome"}
      if exists process procName then
        tell process procName
          set frontmost to true
          set index of front window to 1
        end tell
        exit repeat
      end if
    end repeat
  end tell`,
    ],
    { encoding: "utf8" },
  );
  await page.waitForTimeout(400);
  const { bounds } = await cdp.send("Browser.getWindowBounds", { windowId });
  if (bounds.width !== WINDOW.width || bounds.height !== WINDOW.height) {
    throw new Error(
      `Browser window is ${bounds.width}x${bounds.height}, expected ${WINDOW.width}x${WINDOW.height}`,
    );
  }
  const result = spawnSync(
    "screencapture",
    [
      "-x",
      `-R${bounds.left},${bounds.top},${bounds.width},${bounds.height}`,
      targetPath,
    ],
    { encoding: "utf8" },
  );
  if (result.status !== 0 || !existsSync(targetPath)) {
    throw new Error(
      result.stderr?.trim() ||
        "screencapture failed. Grant Screen Recording to Terminal or Cursor in System Settings → Privacy & Security → Screen Recording.",
    );
  }
  assertCaptureSize(targetPath);
}
