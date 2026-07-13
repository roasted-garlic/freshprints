interface PortalLogoProps {
  /** Accessible name when the logo is meaningful (not decorative). */
  alt?: string;
  className?: string;
  /** Logo height in pixels; width scales with the asset aspect ratio. */
  size?: number;
  /** Full wordmark or compact mark for the collapsed sidebar. */
  variant?: 'full' | 'collapsed';
}

export const PORTAL_LOGO_SRC = '/brand/fresh-prints-request-portal-logo.png';
export const PORTAL_LOGO_COLLAPSED_SRC = '/brand/fresh-prints-request-portal-logo-collapsed.png';

export function PortalLogo({
  alt = '',
  className = '',
  size = 36,
  variant = 'full',
}: PortalLogoProps) {
  const src = variant === 'collapsed' ? PORTAL_LOGO_COLLAPSED_SRC : PORTAL_LOGO_SRC;

  return (
    <img
      alt={alt}
      aria-hidden={alt ? undefined : true}
      className={`portal-logo ${className}`.trim()}
      height={size}
      src={src}
      style={
        variant === 'collapsed'
          ? { height: size, width: size, objectFit: 'contain' }
          : { height: size, width: 'auto' }
      }
      width={variant === 'collapsed' ? size : undefined}
    />
  );
}
