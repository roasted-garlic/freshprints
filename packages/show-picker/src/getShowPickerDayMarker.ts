import type { ShowPickerOption } from "./types";

export type ShowPickerDayMarker = "open" | "full" | "completed";

type MarkerOption = Pick<ShowPickerOption, "isFull" | "isOverCapacity" | "statusLabel">;

function isCompletedStatus(statusLabel: string): boolean {
  return (
    statusLabel === "FULLY PRINTED" ||
    statusLabel === "COMPLETED" ||
    statusLabel === "ARCHIVED" ||
    statusLabel === "PAST"
  );
}

function isFullStatus(option: MarkerOption): boolean {
  return (
    option.isFull ||
    option.isOverCapacity ||
    option.statusLabel === "FULL" ||
    option.statusLabel === "OVER MAX"
  );
}

/**
 * Calendar day marker from that day's shows.
 * Mixed days prefer open, then full, then completed.
 */
export function getShowPickerDayMarker(options: readonly MarkerOption[]): ShowPickerDayMarker | null {
  if (options.length === 0) {
    return null;
  }

  const hasOpen = options.some((option) => !isCompletedStatus(option.statusLabel) && !isFullStatus(option));
  if (hasOpen) {
    return "open";
  }

  if (options.some((option) => isFullStatus(option))) {
    return "full";
  }

  if (options.some((option) => isCompletedStatus(option.statusLabel))) {
    return "completed";
  }

  return "open";
}
