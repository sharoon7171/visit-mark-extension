export const VISITMARK_REFRESH_HIGHLIGHTS = "visitmark:refreshHighlights" as const;

export function requestVisitmarkHighlightRefresh(): void {
  void chrome.runtime
    .sendMessage({ type: VISITMARK_REFRESH_HIGHLIGHTS })
    .catch(() => {});
}
