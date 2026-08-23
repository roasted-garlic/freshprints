'use client';

import { validateCustomerUsername } from '@fresh-prints/shared/utils/customerUsername';

interface PortalUsernameFieldProps {
  disabled?: boolean;
  id?: string;
  name?: string;
  onChange?: (value: string) => void;
  value?: string;
}

export function PortalUsernameField({
  disabled = false,
  id = 'username',
  name = 'username',
  onChange,
  value,
}: PortalUsernameFieldProps) {
  return (
    <label className="portal-field">
      <span>Username</span>
      <input
        autoComplete="username"
        disabled={disabled}
        id={id}
        name={name}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        required
        spellCheck={false}
        type="text"
        value={value}
      />
      <span className="portal-field-hint">
        Use your Whatnot username if you can. It helps us match your print requests to you during live
        shows.
      </span>
      <details className="portal-field-details">
        <summary>Requirements</summary>
        <ul className="portal-field-requirements">
          <li>3–32 characters</li>
          <li>Letters, numbers, underscores, or hyphens</li>
          <li>Must start and end with a letter or number</li>
          <li>Capitalization is fine — we store it in lowercase for matching</li>
        </ul>
      </details>
    </label>
  );
}

export function validatePortalUsernameInput(rawUsername: string): string | null {
  const result = validateCustomerUsername(rawUsername);
  return result.isValid ? null : (result.error ?? 'Enter a valid username.');
}
