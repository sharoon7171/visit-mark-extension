import { HexColorPicker } from "react-colorful";

import { DEFAULT_VISITED_HEX } from "@/lib/hexColor";

import {
  colorFieldRoot,
  colorFieldTopRow,
  colorHex,
  colorHexSwatchRow,
  colorHint,
  colorLabel,
  colorLabelBlock,
  colorPickerEmbed,
  colorPickerRoot,
  colorSwatch,
} from "../../ui-classes/color-field";

type ColorSettingProps = {
  disabled?: boolean;
  hint?: string;
  id: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
};

function toFullHex(raw: string): string {
  const digits = raw
    .trim()
    .replace(/^#/, "")
    .replace(/[^0-9a-fA-F]/g, "")
    .slice(0, 6);
  if (digits.length === 0) {
    return DEFAULT_VISITED_HEX;
  }
  if (digits.length === 3) {
    return `#${digits[0]}${digits[0]}${digits[1]}${digits[1]}${digits[2]}${digits[2]}`.toLowerCase();
  }
  return `#${digits.padEnd(6, "0")}`.toLowerCase();
}

export function ColorSetting({
  disabled = false,
  hint,
  id,
  label,
  onChange,
  value,
}: ColorSettingProps) {
  const safe = toFullHex(value);
  const displayHex = safe.toUpperCase();
  const labelId = `${id}-label`;

  return (
    <div className={colorFieldRoot}>
      <div className={colorFieldTopRow}>
        <div className={colorLabelBlock}>
          <label id={labelId} className={colorLabel}>
            {label}
          </label>
          {hint ? <p className={colorHint}>{hint}</p> : null}
        </div>
        <div className={colorHexSwatchRow}>
          <span
            className={colorSwatch}
            style={{ backgroundColor: safe }}
            aria-hidden
          />
          <span className={colorHex} aria-hidden>
            {displayHex}
          </span>
        </div>
      </div>
      <div
        className={
          disabled
            ? `${colorPickerEmbed} pointer-events-none opacity-50`
            : colorPickerEmbed
        }
      >
        <HexColorPicker
          id={id}
          color={safe}
          onChange={(next) => onChange(toFullHex(next))}
          aria-labelledby={labelId}
          className={colorPickerRoot}
        />
      </div>
    </div>
  );
}
