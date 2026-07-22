'use client'

import { usePortalBrandLogoSettingsReady } from '../hooks/usePortalBrandLogoSettings'
import { usePortalBrandLogoSrc } from '../hooks/usePortalBrandLogoSrc'

interface PortalLogoProps {
  /** Accessible name when the logo is meaningful (not decorative). */
  alt?: string
  className?: string
  /** Legacy single-dimension size (height). Prefer heightPx; width follows intrinsic AR unless widthPx is set. */
  size?: number
  widthPx?: number
  heightPx?: number
  /** Full wordmark or compact mark for the collapsed sidebar. */
  variant?: 'full' | 'collapsed'
  /** Optional override; when omitted, resolves uploaded Portal logo or static fallback. */
  src?: string
}

export const PORTAL_LOGO_SRC = '/brand/fresh-prints-request-portal-logo.png'
export const PORTAL_LOGO_COLLAPSED_SRC = '/brand/fresh-prints-request-portal-logo-collapsed.png'

/** 1×1 transparent GIF — used while settings resolve so the bundled default is never requested. */
const LOGO_PLACEHOLDER_SRC =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

export function PortalLogo({
  alt = '',
  className = '',
  size = 36,
  widthPx,
  heightPx,
  variant = 'full',
  src: srcOverride,
}: PortalLogoProps) {
  const height = heightPx ?? size
  const width = widthPx ?? (variant === 'collapsed' ? height : undefined)
  const fallback = variant === 'collapsed' ? PORTAL_LOGO_COLLAPSED_SRC : PORTAL_LOGO_SRC
  const resolvedFromSettings = usePortalBrandLogoSrc(variant, fallback)
  const logosReady = usePortalBrandLogoSettingsReady()
  const src = srcOverride ?? resolvedFromSettings
  // Hide until cache/Firestore resolve so bundled defaults do not flash over custom uploads.
  const showLogo = Boolean(srcOverride) || logosReady

  return (
    <img
      alt={alt}
      aria-hidden={alt ? undefined : true}
      className={`portal-logo ${className}`.trim()}
      height={height}
      src={showLogo ? src : LOGO_PLACEHOLDER_SRC}
      style={
        width !== undefined
          ? { height, width, objectFit: 'contain', opacity: showLogo ? 1 : 0 }
          : { height, width: 'auto', objectFit: 'contain', opacity: showLogo ? 1 : 0 }
      }
      width={width}
    />
  )
}
