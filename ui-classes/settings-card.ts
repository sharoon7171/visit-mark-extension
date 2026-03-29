const cardFrame =
  "overflow-hidden rounded-xl border border-border shadow-sm";

export const settingsCardGlobal = `${cardFrame} bg-settings-globalCard`;

export const settingsCardSite = `${cardFrame} bg-settings-siteCard`;

export const settingsCardHead =
  "flex flex-col gap-2 border-b border-border px-4 py-4";

export const settingsCardTitle =
  "min-w-0 text-lg font-bold leading-tight tracking-tight text-foreground";

export const settingsCardScopeGlobal =
  "inline-flex w-fit max-w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold tracking-wide text-foreground-muted";

export const settingsCardScopeSite =
  "inline-flex w-fit max-w-full rounded-lg border border-border-strong bg-surface-raised px-3 py-2 font-mono text-[13px] font-semibold leading-snug text-foreground shadow-sm wrap-anywhere";

export const settingsCardScopeSiteMuted =
  "inline-flex w-fit max-w-full rounded-lg border border-dashed border-border bg-surface px-3 py-2 text-sm font-medium leading-snug text-foreground-subtle";

export const settingsCardBody = "flex flex-col divide-y divide-border";
