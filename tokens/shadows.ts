const ink = "15 23 42";

export const designShadows = {
  card: `
    0 1px 2px rgb(${ink} / 0.04),
    0 4px 12px rgb(${ink} / 0.05)
  `
    .replace(/\s+/g, " ")
    .trim(),

  footer: `0 -1px 0 rgb(${ink} / 0.05)`,

  header: `
    0 1px 0 rgb(255 255 255 / 0.08) inset,
    0 8px 24px rgb(0 0 0 / 0.18),
    0 2px 8px rgb(0 0 0 / 0.12)
  `
    .replace(/\s+/g, " ")
    .trim(),

  knob: `0 1px 3px rgb(0 0 0 / 0.2), 0 1px 1px rgb(255 255 255 / 0.06)`,

  "switch-inset": `inset 0 1px 1px rgb(${ink} / 0.1)`,

  "switch-inset-on": `inset 0 1px 2px rgb(37 99 235 / 0.35)`,

  well: `inset 0 1px 2px rgb(${ink} / 0.04)`,
} as const;
