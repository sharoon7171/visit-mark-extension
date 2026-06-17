import { HexColorPicker } from "react-colorful";

import { DEFAULT_VISITED_HEX } from "@/lib/hex-color";

import {
  colorFieldRoot,
  colorHex,
  colorHexSwatchRow,
  colorLabel,
  colorPickerEmbed,
  colorSwatch,
} from "../../../ui-classes/color-field";

type ColorSettingProps = {
  disabled?: boolean;
  id: string;
  label?: string;
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
  id,
  label = "Highlight color",
  onChange,
  value,
}: ColorSettingProps) {
  const safe = toFullHex(value);
  const displayHex = safe.toUpperCase();
  const labelId = `${id}-label`;
  const rootClass = disabled ? "pointer-events-none opacity-40" : "";

  return (
    <div className={`${colorFieldRoot} ${rootClass}`}>
      <p className={colorLabel}>{label}</p>
      <div className={colorHexSwatchRow}>
        <span
          className={colorSwatch}
          style={{ backgroundColor: safe }}
          aria-hidden
        />
        <span id={labelId} className={colorHex}>
          {displayHex}
        </span>
      </div>
      <div className={colorPickerEmbed}>
        <HexColorPicker
          id={id}
          color={safe}
          onChange={(next) => onChange(toFullHex(next))}
          aria-labelledby={labelId}
          className="w-full"
        />
      </div>
    </div>
  );
}
