import {
  toggleHint,
  toggleLabel,
  toggleThumb,
  toggleThumbOff,
  toggleThumbOn,
  toggleTrack,
  toggleTrackOff,
  toggleTrackOn,
} from "../../../ui-classes/control";
import { toggleRowInset } from "../../../ui-classes/layout";

type ToggleProps = {
  checked: boolean;
  className?: string;
  description?: string;
  disabled?: boolean;
  id: string;
  label: string;
  onChange: (checked: boolean) => void;
};

export function Toggle({
  checked,
  className = toggleRowInset,
  description,
  disabled = false,
  id,
  label,
  onChange,
}: ToggleProps) {
  const descriptionId = description ? `${id}-desc` : undefined;

  const handleRowClick = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  const handleSwitchClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!disabled) {
      onChange(!checked);
    }
  };

  return (
    <div
      className={`flex cursor-pointer items-center justify-between gap-2 ${disabled ? "cursor-not-allowed opacity-40" : ""} ${className}`}
      onClick={handleRowClick}
    >
      <div className="min-w-0 flex-1">
        <span className={`block select-none ${toggleLabel}`}>{label}</span>
        {description ? (
          <span id={descriptionId} className={`mt-0.5 block select-none ${toggleHint}`}>
            {description}
          </span>
        ) : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        aria-describedby={descriptionId}
        disabled={disabled}
        onClick={handleSwitchClick}
        className={`${toggleTrack} ${checked ? toggleTrackOn : toggleTrackOff}`}
      >
        <span
          className={`${toggleThumb} ${checked ? toggleThumbOn : toggleThumbOff}`}
        />
      </button>
    </div>
  );
}
