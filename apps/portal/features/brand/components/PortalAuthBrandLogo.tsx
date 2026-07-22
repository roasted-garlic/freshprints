'use client'

import { PortalLogo } from '../components/PortalLogo'
import { usePortalBrandLogoSettings } from '../hooks/usePortalBrandLogoSettings'

interface PortalAuthBrandLogoProps {
  alt?: string
  className?: string
}

/** Auth-page logo sized from `settings/brandLogos.portalAuth` (width×height, AR locked). */
export function PortalAuthBrandLogo({
  alt = 'Fresh Prints Request Portal',
  className = 'portal-auth-logo',
}: PortalAuthBrandLogoProps) {
  const settings = usePortalBrandLogoSettings()
  return (
    <PortalLogo
      alt={alt}
      className={className}
      heightPx={settings.portalAuth.heightPx}
      widthPx={settings.portalAuth.widthPx}
    />
  )
}
