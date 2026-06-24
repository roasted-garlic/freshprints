import {
  EFFECTIVE_DPI_PREFERRED_MIN,
  EFFECTIVE_DPI_SMALL_FORMAT_MIN,
  EFFECTIVE_DPI_STANDARD_MIN,
} from "../constants/printSize.constants";
import type { EffectiveDpiQualityLevel } from "../types/printSize/printSize.enums";

export function resolveEffectiveDpiQualityLevel(effectiveDpi: number): EffectiveDpiQualityLevel {
  if (!Number.isFinite(effectiveDpi)) {
    return "low_resolution";
  }

  if (effectiveDpi >= EFFECTIVE_DPI_PREFERRED_MIN) {
    return "preferred";
  }

  if (effectiveDpi >= EFFECTIVE_DPI_STANDARD_MIN) {
    return "standard";
  }

  if (effectiveDpi >= EFFECTIVE_DPI_SMALL_FORMAT_MIN) {
    return "small_format";
  }

  return "low_resolution";
}

export function getEffectiveDpiQualityLabel(level: EffectiveDpiQualityLevel): string {
  switch (level) {
    case "preferred":
      return "Preferred";
    case "standard":
      return "Standard";
    case "small_format":
      return "Small-format";
    case "low_resolution":
      return "Low-resolution";
    default:
      return level;
  }
}

export function getEffectiveDpiQualityMessage(level: EffectiveDpiQualityLevel): string {
  switch (level) {
    case "preferred":
      return "Effective DPI meets the 300 DPI production target.";
    case "standard":
      return "Effective DPI is below 300 but acceptable for many production uses.";
    case "small_format":
      return "Effective DPI is suited to small-format prints at this size.";
    case "low_resolution":
      return "Effective DPI is low — output may appear soft at this print size.";
    default:
      return "";
  }
}
