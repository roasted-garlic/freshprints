import { normalizeSmartProfileStringList } from "@fresh-prints/shared/utils/smartProfileNormalization";

export function addSmartProfilePresetValue(values: readonly string[], input: string): string[] {
  return normalizeSmartProfileStringList([...values, input]) ?? [];
}

export function removeSmartProfilePresetValue(values: readonly string[], value: string): string[] {
  return values.filter((candidate) => candidate !== value);
}
