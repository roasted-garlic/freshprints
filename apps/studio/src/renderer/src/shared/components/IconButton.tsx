import type { ButtonHTMLAttributes, ReactNode } from "react";

type IconButtonVariant = "ghost" | "muted" | "outline";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  label: string;
  size?: "sm" | "md";
  variant?: IconButtonVariant;
}

export function IconButton({
  children,
  className = "",
  label,
  size = "sm",
  variant = "ghost",
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button
      aria-label={label}
      className={`icon-button icon-button-${size} icon-button-${variant} ${className}`.trim()}
      title={label}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}
