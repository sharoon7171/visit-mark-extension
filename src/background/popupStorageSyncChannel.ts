import {
  flushPopupSyncedState,
  type PopupSyncFlushPayload,
} from "@/extension-host-settings";

export const POPUP_PORT_NAME = "visitedlinks-popup";

type PopupStateMessage = { type: "state"; payload: PopupSyncFlushPayload };

export function installPopupStorageSyncChannel(): void {
  chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== POPUP_PORT_NAME) return;
    let last: PopupSyncFlushPayload | null = null;
    const onMessage = (msg: unknown) => {
      if (
        msg &&
        typeof msg === "object" &&
        (msg as PopupStateMessage).type === "state"
      ) {
        last = (msg as PopupStateMessage).payload;
      }
    };
    port.onMessage.addListener(onMessage);
    port.onDisconnect.addListener(() => {
      port.onMessage.removeListener(onMessage);
      const snap = last;
      last = null;
      if (snap) void flushPopupSyncedState(snap);
    });
  });
}
