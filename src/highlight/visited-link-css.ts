import { VISITED_LINK_COLOR_SELECTORS } from "./visited-targets";

export const LEGACY_NEUTRALIZE_VISITED_LINK_CSS =
  VISITED_LINK_COLOR_SELECTORS.map(
    (sel) =>
      `${sel}{color:revert!important;text-decoration:revert!important;-webkit-text-fill-color:revert!important;}`,
  ).join("");

export function buildVisitedLinkCss(color: string): string {
  const root = `:root{--visitmark-visited:${color}}`;
  const rules = VISITED_LINK_COLOR_SELECTORS.map(
    (sel) => `${sel}{color:var(--visitmark-visited)!important;}`,
  ).join("");
  return root + rules;
}
