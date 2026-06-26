import type { ReactNode } from "react";

import type { EffectiveDpiQualityLevel } from "../../../../../shared/types/printSize/printSize.enums";
import {
  formatResolutionQualityTooltip,
  getEffectiveDpiQualityClassName,
  getEffectiveDpiQualityLabel,
  resolveEffectiveDpiQualityLevel,
} from "../../../../../shared/utils/effectiveDpiQuality";

import { Badge } from "./Badge";

interface ResolutionQualityPillProps {
  effectiveDpi: number;
  /** When true, shows full "Optimal Resolution" style label in tooltip only. */
  className?: string;
}

export function ResolutionQualityPill({ className = "", effectiveDpi }: ResolutionQualityPillProps) {
  const level = resolveEffectiveDpiQualityLevel(effectiveDpi);
  const label = getEffectiveDpiQualityLabel(level);
  const tooltip = formatResolutionQualityTooltip(level, effectiveDpi);
  const pillClassName = `${getEffectiveDpiQualityClassName(level)} ${className}`.trim();

  return (
    <Badge
      aria-label={tooltip}
      className={pillClassName}
      title={tooltip}
      variant={getResolutionQualityBadgeVariant(level)}
    >
      {label}
    </Badge>
  );
}

function getResolutionQualityBadgeVariant(
  level: EffectiveDpiQualityLevel,
): "success" | "warning" | "danger" | "default" {
  switch (level) {
    case "optimal":
      return "success";
    case "good":
      return "warning";
    case "bad":
      return "danger";
    case "terrible":
      return "default";
    default:
      return "default";
  }
}

export function ResolutionQualityText({
  effectiveDpi,
}: {
  effectiveDpi: number;
}): ReactNode {
  const level = resolveEffectiveDpiQualityLevel(effectiveDpi);

  return (
    <span className={getEffectiveDpiQualityClassName(level)}>
      {getEffectiveDpiQualityLabel(level)}
    </span>
  );
}
