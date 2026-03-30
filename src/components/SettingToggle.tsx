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
  checked: boolean;
  description?: string;
  disabled?: boolean;
  id: string;
  label: string;
  onChange: (checked: boolean) => void;
};

export function SettingToggle({
  checked,
  description,
  disabled = false,
  id,
  label,
  onChange,
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
