import { Archive, ArrowLeft, type LucideIcon } from "lucide-react";

import { Button } from "./Button";

interface ToolbarLabelButtonProps {
  "aria-pressed"?: boolean;
  className?: string;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}

function ToolbarLabelButton({
  "aria-pressed": ariaPressed,
  className = "",
  icon: Icon,
  label,
  onClick,
}: ToolbarLabelButtonProps) {
  return (
    <Button
      aria-pressed={ariaPressed}
      className={`button-leading-icon ${className}`.trim()}
      onClick={onClick}
      size="md"
      variant="secondary"
    >
      <Icon aria-hidden="true" size={16} strokeWidth={2} />
      {label}
    </Button>
  );
}

interface CatalogToolbarButtonProps {
  className?: string;
  onClick: () => void;
}

export function ArchivedToolbarButton({ className, onClick }: CatalogToolbarButtonProps) {
  return (
    <ToolbarLabelButton
      className={className}
      icon={Archive}
      label="Archived"
      onClick={onClick}
    />
  );
}

export function BackToolbarButton({ className, onClick }: CatalogToolbarButtonProps) {
  return (
    <ToolbarLabelButton className={className} icon={ArrowLeft} label="Back" onClick={onClick} />
  );
}
