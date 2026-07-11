import type { ShowPickerOption } from "./types";

type DefaultSelectableOption = Pick<ShowPickerOption, "id" | "isFull">;

/**
 * Picks a default show from an ordered picker list (soonest-first).
 * Prefers the first option that can fit the current request when `canFitById` is provided,
 * then the first non-full option, then the first option.
 */
export function getDefaultShowPickerOptionId(
  options: readonly DefaultSelectableOption[],
  canFitById?: (id: string) => boolean,
): string | null {
  if (options.length === 0) {
    return null;
  }

  if (canFitById) {
    const firstFitting = options.find((option) => canFitById(option.id));
    if (firstFitting) {
      return firstFitting.id;
    }
  }

  return options.find((option) => !option.isFull)?.id ?? options[0]?.id ?? null;
}
