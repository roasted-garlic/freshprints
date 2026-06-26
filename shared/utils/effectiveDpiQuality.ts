import {
  EFFECTIVE_DPI_BAD_MIN,
  EFFECTIVE_DPI_GOOD_MIN,
  EFFECTIVE_DPI_OPTIMAL_MIN,
  MIN_ACCEPTABLE_EFFECTIVE_DPI,
} from "../constants/printSize.constants";
import type { EffectiveDpiQualityLevel } from "../types/printSize/printSize.enums";

export function resolveEffectiveDpiQualityLevel(effectiveDpi: number): EffectiveDpiQualityLevel {
  if (!Number.isFinite(effectiveDpi) || effectiveDpi < MIN_ACCEPTABLE_EFFECTIVE_DPI) {
    return "terrible";
  }

  if (effectiveDpi >= EFFECTIVE_DPI_OPTIMAL_MIN) {
    return "optimal";
  }

  if (effectiveDpi >= EFFECTIVE_DPI_GOOD_MIN) {
    return "good";
  }

  if (effectiveDpi >= EFFECTIVE_DPI_BAD_MIN) {
    return "bad";
  }

  return "terrible";
}

export function getEffectiveDpiQualityLabel(level: EffectiveDpiQualityLevel): string {
  switch (level) {
    case "optimal":
      return "Optimal";
    case "good":
      return "Good";
    case "bad":
      return "Bad";
    case "terrible":
      return "Terrible";
    default:
      return level;
  }
}

export function getEffectiveDpiQualityMessage(level: EffectiveDpiQualityLevel): string {
  switch (level) {
    case "optimal":
      return "Effective DPI meets the 300 DPI production target.";
    case "good":
      return "Effective DPI is below 300 but acceptable for many production uses.";
    case "bad":
      return "Effective DPI may appear soft on larger apparel prints.";
    case "terrible":
      return "Effective DPI is at the minimum accepted import floor — suitable for small prints only.";
    default:
      return "";
  }
}

/** CSS class token for resolution quality pills and inline quality text. */
export function getEffectiveDpiQualityClassName(level: EffectiveDpiQualityLevel): string {
  return `resolution-quality resolution-quality-${level}`;
}

export function formatResolutionQualityTooltip(
  level: EffectiveDpiQualityLevel,
  effectiveDpi: number,
): string {
  return `${getEffectiveDpiQualityLabel(level)} Resolution · ${effectiveDpi} DPI`;
}
