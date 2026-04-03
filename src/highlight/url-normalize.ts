export function normalizeUrlForHistoryMatch(url: string): string | null {
  try {
    const u = new URL(url);
    u.hash = "";
    u.hostname = u.hostname.toLowerCase();
    return u.href;
  } catch {
    return null;
  }
}
