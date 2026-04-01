import { VISITED_LINK_COLOR_SELECTORS } from "@/visited-link-targets";

export function buildVisitedLinkCss(color: string): string {
  const lines: string[] = [
    `:root { --visitmark-visited: ${color}; }`,
  ];
  for (const sel of VISITED_LINK_COLOR_SELECTORS) {
    lines.push(`${sel}{color:var(--visitmark-visited)!important;}`);
  }
  return lines.join("");
}
