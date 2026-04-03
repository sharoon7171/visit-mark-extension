export function syncVisitmarkVisitedCssOnPage(css: string | null): void {
  const styleId = "visitmark-visited-styles";
  const existing = document.getElementById(styleId);
  if (existing) {
    existing.remove();
  }
  if (!css) {
    return;
  }
  const el = document.createElement("style");
  el.id = styleId;
  el.textContent = css;
  const root = document.head ?? document.documentElement;
  root.appendChild(el);
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
  const mark = "data-visitmark-hist";
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
  function clearHistoryMarks(): void {
    const prev = document.querySelectorAll(`[${mark}]`);
    for (let i = 0; i < prev.length; i++) {
      const el = prev[i] as HTMLElement;
      el.removeAttribute(mark);
      el.style.removeProperty("color");
      if (el.style.length === 0) {
        el.removeAttribute("style");
      }
    }
  }
  clearHistoryMarks();
  const want = new Set(urls);
  const anchors = document.querySelectorAll("a[href]");
  for (let i = 0; i < anchors.length; i++) {
    const a = anchors[i] as HTMLAnchorElement;
    const key = normalizeHrefForMatch(a.href);
    if (!key || !want.has(key)) {
      continue;
    }
    a.setAttribute(mark, "1");
    a.style.setProperty("color", color, "important");
    const kids = a.querySelectorAll("*");
    for (let j = 0; j < kids.length; j++) {
      const c = kids[j] as HTMLElement;
      c.setAttribute(mark, "1");
      c.style.setProperty("color", color, "important");
    }
  }
}

export function clearHistoryHighlightsOnPage(): void {
  const mark = "data-visitmark-hist";
  const prev = document.querySelectorAll(`[${mark}]`);
  for (let i = 0; i < prev.length; i++) {
    const el = prev[i] as HTMLElement;
    el.removeAttribute(mark);
    el.style.removeProperty("color");
    if (el.style.length === 0) {
      el.removeAttribute("style");
    }
  }
}
