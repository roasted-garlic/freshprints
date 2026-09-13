interface PortalToggleProps {
  checked: boolean;
  disabled?: boolean;
  id?: string;
  label: string;
  name: string;
  onChange: (checked: boolean) => void;
}

export function PortalToggle({
  checked,
  disabled = false,
  id,
  label,
  name,
  onChange,
}: PortalToggleProps) {
  const controlId = id ?? name;
  const labelId = `${controlId}-label`;

  return (
    <div className="portal-form-toggle">
      <button
        aria-checked={checked}
        aria-disabled={disabled}
        aria-labelledby={labelId}
        className={[
          'portal-toggle-switch',
          checked ? 'portal-toggle-switch-on' : '',
          disabled ? 'portal-toggle-switch-disabled' : '',
        ]
          .filter(Boolean)
          .join(' ')}
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
      <span className="portal-form-toggle-label" id={labelId}>
        {label}
      </span>
    </div>
  );
}
