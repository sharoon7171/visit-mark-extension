export function visitmarkCollectAnchorHrefs(): string[] {
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

export function visitmarkApplyHistoryHighlights(
  color: string,
  urls: string[],
): void {
  const MARK = "data-visitmark-hist";
  const prev = document.querySelectorAll(`[${MARK}]`);
  for (let i = 0; i < prev.length; i++) {
    const el = prev[i] as HTMLElement;
    el.removeAttribute(MARK);
    el.style.removeProperty("color");
  }
  const want = new Set(urls);
  const norm = (raw: string): string => {
    try {
      const u = new URL(raw);
      u.hash = "";
      u.hostname = u.hostname.toLowerCase();
      return u.href;
    } catch {
      return "";
    }
  };
  const anchors = document.querySelectorAll("a[href]");
  for (let i = 0; i < anchors.length; i++) {
    const a = anchors[i] as HTMLAnchorElement;
    const key = norm(a.href);
    if (!key || !want.has(key)) {
      continue;
    }
    a.setAttribute(MARK, "1");
    a.style.setProperty("color", color, "important");
    const kids = a.querySelectorAll("*");
    for (let j = 0; j < kids.length; j++) {
      const c = kids[j] as HTMLElement;
      c.setAttribute(MARK, "1");
      c.style.setProperty("color", color, "important");
    }
  }
}

export function visitmarkCleanupHistoryHighlights(): void {
  const MARK = "data-visitmark-hist";
  const prev = document.querySelectorAll(`[${MARK}]`);
  for (let i = 0; i < prev.length; i++) {
    const el = prev[i] as HTMLElement;
    el.removeAttribute(MARK);
    el.style.removeProperty("color");
  }
}
