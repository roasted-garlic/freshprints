import studioLogoUrl from "../../../../assets/brand/fresh-prints-studio-logo.png";
import studioLogoCollapsedUrl from "../../../../assets/brand/fresh-prints-studio-logo-collapsed.png";
import { useStudioBrandLogoSettingsReady } from "../../features/settings/hooks/useStudioBrandLogoSettings";
import { useStudioBrandLogoSrc } from "../../features/settings/hooks/useStudioBrandLogoSrc";

interface AppLogoProps {
  /** Accessible name when the logo is meaningful (not decorative). */
  alt?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  /** Prefer heightPx alone in chrome (width follows intrinsic AR). Pass widthPx only when a fixed box is intentional. */
  widthPx?: number;
  heightPx?: number;
  /** Full wordmark or compact mark for the collapsed sidebar. */
  variant?: "full" | "collapsed";
  /** Optional override; when omitted, resolves uploaded Studio logo or bundled fallback. */
  src?: string;
}

const logoHeights = {
  sm: 36,
  md: 52,
  lg: 72,
} as const;

/** 1×1 transparent GIF — used while settings resolve so the bundled default is never requested. */
const LOGO_PLACEHOLDER_SRC =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

export function AppLogo({
  alt = "",
  className = "",
  size = "md",
  widthPx,
  heightPx,
  variant = "full",
  src: srcOverride,
}: AppLogoProps) {
  const tokenHeight = logoHeights[size];
  const height = heightPx ?? tokenHeight;
  const width = widthPx ?? (variant === "collapsed" ? height : undefined);
  const fallback = variant === "collapsed" ? studioLogoCollapsedUrl : studioLogoUrl;
  const resolvedFromSettings = useStudioBrandLogoSrc(variant, fallback);
  const logosReady = useStudioBrandLogoSettingsReady();
  const src = srcOverride ?? resolvedFromSettings;
  // Hide until cache/Firestore resolve so bundled defaults do not flash over custom uploads.
  const showLogo = Boolean(srcOverride) || logosReady;

  return (
    <img
      alt={alt}
      aria-hidden={alt ? undefined : true}
      className={`app-logo ${className}`.trim()}
      height={height}
      src={showLogo ? src : LOGO_PLACEHOLDER_SRC}
      style={
        width !== undefined
          ? { height, width, objectFit: "contain", opacity: showLogo ? 1 : 0 }
          : { height, width: "auto", objectFit: "contain", opacity: showLogo ? 1 : 0 }
      }
      width={width}
    />
  );
}
