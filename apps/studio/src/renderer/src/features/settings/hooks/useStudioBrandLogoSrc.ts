import {
  resolveBrandLogoDownloadUrl,
  type BrandLogoApp,
  type BrandLogoSlotKind,
} from "@fresh-prints/shared/constants/brand/brandLogoSettings.constants";
import { useStudioBrandLogoSettings } from "./useStudioBrandLogoSettings";

/** Shared Studio subscription for brand logo download URLs (bundled fallback when unset). */
export function useStudioBrandLogoSrc(
  slot: BrandLogoSlotKind,
  fallbackUrl: string,
  app: BrandLogoApp = "studio",
): string {
  const settings = useStudioBrandLogoSettings();
  return resolveBrandLogoDownloadUrl(settings, app, slot, fallbackUrl);
}
