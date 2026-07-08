interface PortalLogoProps {
  className?: string;
  size?: number;
}

export function PortalLogo({ className = '', size = 36 }: PortalLogoProps) {
  return (
    <svg
      aria-hidden="true"
      className={`portal-logo ${className}`.trim()}
      height={size}
      viewBox="0 0 40 40"
      width={size}
    >
      <circle cx="20" cy="20" fill="var(--color-accent-primary)" r="20" />
      <text
        dominantBaseline="middle"
        fill="var(--color-accent-primary-text)"
        fontFamily="Segoe UI, system-ui, sans-serif"
        fontSize="13"
        fontWeight="700"
        letterSpacing="-0.04em"
        textAnchor="middle"
        x="20"
        y="21"
      >
        FP
      </text>
    </svg>
  );
}
