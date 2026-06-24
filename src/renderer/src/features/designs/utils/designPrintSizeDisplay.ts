import type { EffectiveDpiQualityLevel } from "../../../../../../shared/types/printSize/printSize.enums";
import { PRINT_INCHES_DECIMAL_PLACES } from "../../../../../../shared/constants/printSize.constants";

export function formatDesignPrintInches(value: number): string {
  return value.toFixed(PRINT_INCHES_DECIMAL_PLACES);
}

export function getEffectiveDpiQualityClassName(level: EffectiveDpiQualityLevel): string {
  switch (level) {
    case "preferred":
      return "design-print-quality design-print-quality-preferred";
    case "standard":
      return "design-print-quality design-print-quality-standard";
    case "small_format":
      return "design-print-quality design-print-quality-small-format";
    case "low_resolution":
      return "design-print-quality design-print-quality-low-resolution";
    default:
      return "design-print-quality";
  }
}
