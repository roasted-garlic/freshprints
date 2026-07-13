import studioLogoUrl from "../../../../assets/brand/fresh-prints-studio-logo.png";
import studioLogoCollapsedUrl from "../../../../assets/brand/fresh-prints-studio-logo-collapsed.png";

interface AppLogoProps {
  /** Accessible name when the logo is meaningful (not decorative). */
  alt?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  /** Full wordmark or compact mark for the collapsed sidebar. */
  variant?: "full" | "collapsed";
}

const logoHeights = {
  sm: 36,
  md: 52,
  lg: 72,
} as const;

export function AppLogo({
  alt = "",
  className = "",
  size = "md",
  variant = "full",
}: AppLogoProps) {
  const height = logoHeights[size];
  const src = variant === "collapsed" ? studioLogoCollapsedUrl : studioLogoUrl;

  return (
    <img
      alt={alt}
      aria-hidden={alt ? undefined : true}
      className={`app-logo ${className}`.trim()}
      height={height}
      src={src}
      style={
        variant === "collapsed"
          ? { height, width: height, objectFit: "contain" }
          : { height, width: "auto" }
      }
      width={variant === "collapsed" ? height : undefined}
    />
  );
}
