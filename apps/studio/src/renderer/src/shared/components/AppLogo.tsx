interface AppLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const logoSizes = {
  sm: 32,
  md: 36,
  lg: 44,
} as const;

export function AppLogo({ className = "", size = "md" }: AppLogoProps) {
  const dimension = logoSizes[size];

  return (
    <svg
      aria-hidden="true"
      className={`app-logo ${className}`.trim()}
      height={dimension}
      viewBox="0 0 40 40"
      width={dimension}
    >
      <circle cx="20" cy="20" fill="#2563eb" r="20" />
      <text
        dominantBaseline="middle"
        fill="#ffffff"
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
