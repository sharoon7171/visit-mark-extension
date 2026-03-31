import {
  VISIT_TARGET_DEFINITIONS,
  type VisitTargetToggles,
} from "@/visited-link-targets";

export function buildVisitedLinkCss(
  color: string,
  toggles: VisitTargetToggles,
): string {
  const lines: string[] = [
    `:root { --visitmark-visited: ${color}; }`,
  ];
  for (const def of VISIT_TARGET_DEFINITIONS) {
    if (!toggles[def.id]) {
      continue;
    }
    for (const sel of def.selectors) {
      lines.push(`${sel}{color:var(--visitmark-visited)!important;}`);
    }
  }
  return lines.join("");
}
