export const DEFAULT_VISITED_HEX = "#551a8b";

export function parseHexColor(value: unknown, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }
  const t = value.trim();
  if (/^#[0-9a-fA-F]{3}$/.test(t) || /^#[0-9a-fA-F]{6}$/.test(t)) {
    return t.toLowerCase();
  }
  return fallback;
}
