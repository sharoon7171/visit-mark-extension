import { normalizeUrlForHistoryMatch } from "@/lib/urlNormalize";

const RAW_HREF_BATCH = 80;

function urlCandidatesForHistoryLookup(rawHref: string): string[] {
  const out = new Set<string>();
  try {
    const primary = new URL(rawHref);
    out.add(primary.href);
    const norm = normalizeUrlForHistoryMatch(rawHref);
    if (norm) {
      out.add(norm);
    }
    const p = primary.pathname;
    if (p.length > 1 && p.endsWith("/")) {
      const u2 = new URL(primary.href);
      u2.pathname = p.replace(/\/+$/, "") || "/";
      out.add(u2.href);
    } else if (p.length > 1 && !p.endsWith("/")) {
      const u2 = new URL(primary.href);
      u2.pathname = `${p}/`;
      out.add(u2.href);
    }
  } catch {
    return [];
  }
  return Array.from(out);
}

async function pageRawHrefHasHistoryVisit(rawHref: string): Promise<boolean> {
  const candidates = urlCandidatesForHistoryLookup(rawHref);
  if (candidates.length === 0) {
    return false;
  }
  const visitLists = await Promise.all(
    candidates.map((c) => chrome.history.getVisits({ url: c })),
  );
  return visitLists.some((v) => v.length > 0);
}

export async function listNormalizedUrlsWithHistoryVisits(
  rawHrefs: string[],
): Promise<string[]> {
  const seenRaw = new Set<string>();
  const uniqueRaw: string[] = [];
  for (let i = 0; i < rawHrefs.length; i++) {
    const r = rawHrefs[i];
    if (seenRaw.has(r)) {
      continue;
    }
    seenRaw.add(r);
    uniqueRaw.push(r);
  }
  const matchedNorm = new Set<string>();
  for (let i = 0; i < uniqueRaw.length; i += RAW_HREF_BATCH) {
    const batch = uniqueRaw.slice(i, i + RAW_HREF_BATCH);
    const flags = await Promise.all(
      batch.map((raw) => pageRawHrefHasHistoryVisit(raw)),
    );
    for (let j = 0; j < batch.length; j++) {
      if (!flags[j]) {
        continue;
      }
      const raw = batch[j];
      const n = normalizeUrlForHistoryMatch(raw);
      if (n) {
        matchedNorm.add(n);
      } else {
        try {
          matchedNorm.add(new URL(raw).href);
        } catch {}
      }
    }
  }
  return Array.from(matchedNorm).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}
