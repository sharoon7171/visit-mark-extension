import { useCallback, useEffect, useRef } from "react";
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
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  suppressProgrammaticPickerEcho?: boolean;
  programmaticEchoResetKey?: string;
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
  id,
  label,
  hint,
  value,
  onChange,
  disabled = false,
  suppressProgrammaticPickerEcho = false,
  programmaticEchoResetKey,
}: ColorSettingProps) {
  const safe = toFullHex(value);
  const displayHex = safe.toUpperCase();
  const labelId = `${id}-label`;
  const pickerCommitOpenRef = useRef(!suppressProgrammaticPickerEcho);

  useEffect(() => {
    if (suppressProgrammaticPickerEcho) {
      pickerCommitOpenRef.current = false;
    } else {
      pickerCommitOpenRef.current = true;
    }
  }, [programmaticEchoResetKey, suppressProgrammaticPickerEcho]);

  const openPickerCommit = useCallback(() => {
    if (suppressProgrammaticPickerEcho) {
      pickerCommitOpenRef.current = true;
    }
  }, [suppressProgrammaticPickerEcho]);

  const handlePickerChange = useCallback(
    (next: string) => {
      if (suppressProgrammaticPickerEcho && !pickerCommitOpenRef.current) {
        return;
      }
      onChange(toFullHex(next));
    },
    [onChange, suppressProgrammaticPickerEcho],
  );

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
        onPointerDownCapture={
          suppressProgrammaticPickerEcho && !disabled
            ? openPickerCommit
            : undefined
        }
        onFocusCapture={
          suppressProgrammaticPickerEcho && !disabled
            ? openPickerCommit
            : undefined
        }
      >
        <HexColorPicker
          id={id}
          color={safe}
          onChange={handlePickerChange}
          aria-labelledby={labelId}
          className={colorPickerRoot}
        />
      </div>
    </div>
  );
}
