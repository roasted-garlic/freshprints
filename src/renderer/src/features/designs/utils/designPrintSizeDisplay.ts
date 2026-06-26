import { PRINT_INCHES_DECIMAL_PLACES } from "../../../../../../shared/constants/printSize.constants";
import { getEffectiveDpiQualityClassName } from "../../../../../../shared/utils/effectiveDpiQuality";

export { getEffectiveDpiQualityClassName };

export function formatDesignPrintInches(value: number): string {
  return value.toFixed(PRINT_INCHES_DECIMAL_PLACES);
}
