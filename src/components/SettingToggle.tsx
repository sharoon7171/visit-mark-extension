import {
  toggleDescription,
  toggleInput,
  toggleLabel,
  toggleRow,
  toggleSwitchKnob,
  toggleSwitchTrack,
  toggleTextBlock,
} from "../../ui-classes/setting-toggle";

type SettingToggleProps = {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
};

export function SettingToggle({
  id,
  label,
  description,
  checked,
  onChange,
  disabled = false,
}: SettingToggleProps) {
  return (
    <div className={toggleRow}>
      <div className={toggleTextBlock}>
        <label htmlFor={id} className={toggleLabel}>
          {label}
        </label>
        {description ? (
          <p className={toggleDescription}>{description}</p>
        ) : null}
      </div>
      <div className={toggleSwitchTrack}>
        <input
          id={id}
          type="checkbox"
          className={toggleInput}
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className={toggleSwitchKnob} aria-hidden />
      </div>
    </div>
  );
}
