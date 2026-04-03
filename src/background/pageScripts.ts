const HISTORY_MARK = "data-visitmark-hist";

function clearHistoryMarks(): void {
  const prev = document.querySelectorAll(`[${HISTORY_MARK}]`);
  for (let i = 0; i < prev.length; i++) {
    const el = prev[i] as HTMLElement;
    el.removeAttribute(HISTORY_MARK);
    el.style.removeProperty("color");
    if (el.style.length === 0) {
      el.removeAttribute("style");
    }
  }
}

function normalizeHrefForMatch(raw: string): string {
  try {
    const u = new URL(raw);
    u.hash = "";
    u.hostname = u.hostname.toLowerCase();
    return u.href;
  } catch {
    return "";
  }
}

export function collectAnchorHrefsFromPage(): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const nodes = document.querySelectorAll("a[href]");
  for (let i = 0; i < nodes.length; i++) {
    const h = (nodes[i] as HTMLAnchorElement).href;
    if (!seen.has(h)) {
      seen.add(h);
      out.push(h);
    }
  }
  return out;
}

export function applyHistoryHighlightColor(color: string, urls: string[]): void {
  clearHistoryMarks();
  const want = new Set(urls);
  const anchors = document.querySelectorAll("a[href]");
  for (let i = 0; i < anchors.length; i++) {
    const a = anchors[i] as HTMLAnchorElement;
    const key = normalizeHrefForMatch(a.href);
    if (!key || !want.has(key)) {
      continue;
    }
    a.setAttribute(HISTORY_MARK, "1");
    a.style.setProperty("color", color, "important");
    const kids = a.querySelectorAll("*");
    for (let j = 0; j < kids.length; j++) {
      const c = kids[j] as HTMLElement;
      c.setAttribute(HISTORY_MARK, "1");
      c.style.setProperty("color", color, "important");
    }
  }
}

export function clearHistoryHighlightsOnPage(): void {
  clearHistoryMarks();
}
