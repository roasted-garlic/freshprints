'use client'

import {
  resolveBrandLogoDownloadUrl,
  type BrandLogoSlotKind,
} from '@fresh-prints/shared/constants/brand/brandLogoSettings.constants'

import { usePortalBrandLogoSettings } from './usePortalBrandLogoSettings'

/** Shared Portal subscription for brand logo download URLs. */
export function usePortalBrandLogoSrc(slot: BrandLogoSlotKind, fallbackUrl: string): string {
  const settings = usePortalBrandLogoSettings()
  return resolveBrandLogoDownloadUrl(settings, 'portal', slot, fallbackUrl)
}
