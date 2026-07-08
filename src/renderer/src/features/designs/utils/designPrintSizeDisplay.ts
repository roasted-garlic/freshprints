import { PRINT_INCHES_DECIMAL_PLACES } from "@fresh-prints/shared/constants/printSize.constants";
import { getEffectiveDpiQualityClassName } from "@fresh-prints/shared/utils/effectiveDpiQuality";

export { getEffectiveDpiQualityClassName };

export function formatDesignPrintInches(value: number): string {
  return value.toFixed(PRINT_INCHES_DECIMAL_PLACES);
}
