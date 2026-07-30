import type { ShowPickerOption } from "./types";

type DefaultSelectableOption = Pick<ShowPickerOption, "id" | "isFull" | "canAllocate">;

/**
 * Picks a default show from an ordered picker list (soonest-first).
 * Prefers selectable (queueable) options. When `allowInspectOnly` is true and nothing
 * is selectable, falls back to the first option so closed/past days can still focus a slot.
 * Prefers the first option that can fit when `canFitById` is provided, then the first
 * non-full selectable option, then the first selectable option.
 */
export function getDefaultShowPickerOptionId(
  options: readonly DefaultSelectableOption[],
  canFitById?: (id: string) => boolean,
  allowInspectOnly = false,
): string | null {
  const selectable = options.filter((option) => option.canAllocate);
  const pool = selectable.length > 0 ? selectable : allowInspectOnly ? [...options] : [];
  if (pool.length === 0) {
    return null;
  }

  if (canFitById && selectable.length > 0) {
    const firstFitting = selectable.find((option) => canFitById(option.id));
    if (firstFitting) {
      return firstFitting.id;
    }
  }

  return pool.find((option) => !option.isFull)?.id ?? pool[0]?.id ?? null;
}
