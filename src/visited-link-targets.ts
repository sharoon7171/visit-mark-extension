const VISIT_TARGET_IDS = [
  "anchorAndRole",
  "semanticContainers",
  "classBased",
  "nestedTypography",
] as const;

export type VisitTargetId = (typeof VISIT_TARGET_IDS)[number];

export type VisitTargetToggles = Record<VisitTargetId, boolean>;

type VisitTargetDefinition = {
  description: string;
  id: VisitTargetId;
  label: string;
  selectors: readonly string[];
};

export const VISIT_TARGET_DEFINITIONS: readonly VisitTargetDefinition[] = [
  {
    id: "anchorAndRole",
    label: "Standard links",
    description:
      "Include ordinary hyperlinks and other elements the page exposes as links.",
    selectors: [
      "html body a:visited",
      "html body a:visited *",
      'html body [role="link"]:visited',
      'html body [role="link"]:visited *',
    ],
  },
  {
    id: "semanticContainers",
    label: "Regions and layout",
    description:
      "Include links inside navigation, headers, footers, articles, and main sections.",
    selectors: [
      "html body div a:visited",
      "html body div a:visited *",
      "html body section a:visited",
      "html body section a:visited *",
      "html body article a:visited",
      "html body article a:visited *",
      "html body main a:visited",
      "html body main a:visited *",
      "html body nav a:visited",
      "html body nav a:visited *",
      "html body header a:visited",
      "html body header a:visited *",
      "html body footer a:visited",
      "html body footer a:visited *",
    ],
  },
  {
    id: "classBased",
    label: "Themed link classes",
    description:
      "Include elements that use common class names sites reserve for link styling.",
    selectors: [
      "html body .link:visited",
      "html body .link:visited *",
      "html body .url:visited",
      "html body .url:visited *",
      "html body .external:visited",
      "html body .external:visited *",
    ],
  },
  {
    id: "nestedTypography",
    label: "Inner formatting",
    description:
      "Include nested bold, italic, and heading text inside visited links.",
    selectors: [
      "html body a:visited span",
      "html body a:visited div",
      "html body a:visited p",
      "html body a:visited h1",
      "html body a:visited h2",
      "html body a:visited h3",
      "html body a:visited h4",
      "html body a:visited h5",
      "html body a:visited h6",
      "html body a:visited strong",
      "html body a:visited em",
      "html body a:visited b",
      "html body a:visited i",
      "html body a:visited u",
    ],
  },
];

export function defaultVisitTargetToggles(): VisitTargetToggles {
  return {
    anchorAndRole: true,
    classBased: true,
    nestedTypography: true,
    semanticContainers: true,
  };
}

export function parseVisitTargetToggles(raw: unknown): VisitTargetToggles {
  const base = defaultVisitTargetToggles();
  if (!raw || typeof raw !== "object") {
    return base;
  }
  const o = raw as Record<string, unknown>;
  for (const id of VISIT_TARGET_IDS) {
    if (typeof o[id] === "boolean") {
      base[id] = o[id];
    }
  }
  return base;
}

export function visitTargetTogglesEqual(
  a: VisitTargetToggles,
  b: VisitTargetToggles,
): boolean {
  return VISIT_TARGET_IDS.every((id) => a[id] === b[id]);
}
