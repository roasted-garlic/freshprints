import type { SmartProfileEditableDimensionKey } from "@fresh-prints/shared/constants/smartProfile.constants";
import {
  normalizeSmartProfileStringList,
  normalizeSmartProfileSubjectList,
} from "@fresh-prints/shared/utils/smartProfileNormalization";

export function addSmartProfilePresetValue(
  values: readonly string[],
  input: string,
  dimension?: SmartProfileEditableDimensionKey,
): string[] {
  if (dimension === "subjects") {
    return normalizeSmartProfileSubjectList([...values, input]) ?? [];
  }
  return normalizeSmartProfileStringList([...values, input]) ?? [];
}

export function removeSmartProfilePresetValue(
  values: readonly string[],
  value: string,
  dimension?: SmartProfileEditableDimensionKey,
): string[] {
  const target = dimension === "subjects" ? value.trim().replace(/\s+/g, " ").toLowerCase() : value;
  return values.filter((candidate) =>
    dimension === "subjects"
      ? candidate.trim().replace(/\s+/g, " ").toLowerCase() !== target
      : candidate !== value,
  );
}
