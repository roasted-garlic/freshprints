import { getDefaultShowPickerOptionId } from "./getDefaultShowPickerOptionId";
import type { ShowPickerOption } from "./types";

export interface ShowPickerSelectionResolution {
  destinationId: string | null;
  shouldClearDestination: boolean;
  /**
   * Set only when no allocatable destination exists for this date's options AND exactly one
   * inspectable show exists — the date should auto-inspect that single show rather than leave the
   * read-only detail panel empty (Plan Section 29.6). `null` when a destination was resolved, or
   * when zero or more than one inspectable show exists (never guess among multiple).
   */
  autoInspectId: string | null;
}

export function resolveShowPickerSelection(
  options: readonly ShowPickerOption[],
): ShowPickerSelectionResolution {
  const destinationId = getDefaultShowPickerOptionId(options);
  if (destinationId !== null) {
    return { destinationId, shouldClearDestination: false, autoInspectId: null };
  }

  const inspectableOptions = options.filter((option) => option.canInspect !== false);
  const autoInspectId = inspectableOptions.length === 1 ? inspectableOptions[0]!.id : null;

  return {
    destinationId: null,
    shouldClearDestination: true,
    autoInspectId,
  };
}

export function canActivateShowPickerOption(option: ShowPickerOption): boolean {
  return option.canInspect !== false;
}
