import type { SelectOption } from "./Select";

/**
 * Local, case-insensitive, partial label filter for Select options.
 * Pure in-memory filter only — no network or service imports.
 */
export function filterSelectOptionsByLabel(
  options: readonly SelectOption[],
  query: string,
): SelectOption[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return [...options];
  }

  return options.filter((option) => option.label.toLowerCase().includes(normalizedQuery));
}
