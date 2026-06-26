interface ToggleProps {
  checked: boolean;
  disabled?: boolean;
  id?: string;
  label: string;
  name: string;
  onChange: (checked: boolean) => void;
}

export function Toggle({ checked, disabled = false, id, label, name, onChange }: ToggleProps) {
  const controlId = id ?? name;
  const labelId = `${controlId}-label`;

  return (
    <div className="form-toggle">
      <button
        aria-checked={checked}
        aria-disabled={disabled}
        aria-labelledby={labelId}
        className={[
          "toggle-switch",
          checked ? "toggle-switch-on" : "",
          disabled ? "toggle-switch-disabled" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        disabled={disabled}
        id={controlId}
        onClick={() => {
          if (!disabled) {
            onChange(!checked);
          }
        }}
        role="switch"
        type="button"
      />
      <span className="form-toggle-label" id={labelId}>
        {label}
      </span>
    </div>
  );
}