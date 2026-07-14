'use client';

import { GoogleIcon } from '../../shared/components/PortalIcons';

interface GoogleAuthButtonProps {
  disabled?: boolean;
  label: string;
  loadingLabel?: string;
  isLoading?: boolean;
  onClick: () => void;
}

export function GoogleAuthButton({
  disabled = false,
  label,
  loadingLabel = 'Connecting…',
  isLoading = false,
  onClick,
}: GoogleAuthButtonProps) {
  return (
    <button
      className="portal-button portal-button-secondary portal-button-leading-icon portal-google-auth-button"
      disabled={disabled || isLoading}
      onClick={onClick}
      type="button"
    >
      <GoogleIcon size={18} />
      {isLoading ? loadingLabel : label}
    </button>
  );
}
