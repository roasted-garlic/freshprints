import type { ShowPickerOption } from "./types";

type DefaultSelectableOption = Pick<ShowPickerOption, "id" | "isFull" | "isSelectable">;

/**
 * Picks a default show from an ordered picker list (soonest-first).
 * Skips non-selectable (e.g. past) options. Prefers the first option that can fit
 * the current request when `canFitById` is provided, then the first non-full selectable
 * option, then the first selectable option.
 */
export function getDefaultShowPickerOptionId(
  options: readonly DefaultSelectableOption[],
  canFitById?: (id: string) => boolean,
): string | null {
  const selectable = options.filter((option) => option.isSelectable !== false);
  if (selectable.length === 0) {
    return null;
  }

  if (canFitById) {
    const firstFitting = selectable.find((option) => canFitById(option.id));
    if (firstFitting) {
      return firstFitting.id;
    }
  }

  return selectable.find((option) => !option.isFull)?.id ?? selectable[0]?.id ?? null;
}
