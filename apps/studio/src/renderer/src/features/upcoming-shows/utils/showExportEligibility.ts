import type { ShowAllocationStatus } from "@fresh-prints/shared/types/showAllocation/showAllocation.enums";
import { isPastScheduledShow, type ShowWithScheduledStart } from "@fresh-prints/shared/utils/showScheduleGrouping";

export const PAST_SHOW_EXPORT_COPY =
  "Past shows are read-only for queue changes. You can still export images or generate gang sheets.";

export interface ShowExportAllocationInput {
  status: ShowAllocationStatus;
  printRequestId?: string;
}

export function shouldUseHistoricalShowExportAllocations(
  show: ShowWithScheduledStart,
  now: Date = new Date(),
): boolean {
  return isPastScheduledShow(show, now);
}

export function filterShowExportAllocations<T extends ShowExportAllocationInput>(
  allocations: readonly T[],
  options: { useHistoricalPastExport: boolean },
): T[] {
  if (options.useHistoricalPastExport) {
    return allocations.filter(
      (allocation) =>
        typeof allocation.printRequestId === "string" && allocation.printRequestId.length > 0,
    );
  }

  return allocations.filter((allocation) => allocation.status !== "canceled");
}

export function hasShowExportableAllocations(input: {
  allocatedQuantity: number;
  allocations: readonly ShowExportAllocationInput[];
  show?: ShowWithScheduledStart;
  now?: Date;
}): boolean {
  const useHistoricalPastExport =
    input.show !== undefined &&
    shouldUseHistoricalShowExportAllocations(input.show, input.now ?? new Date());

  if (
    filterShowExportAllocations(input.allocations, { useHistoricalPastExport }).length > 0
  ) {
    return true;
  }

  if (!useHistoricalPastExport && input.allocatedQuantity > 0) {
    return true;
  }

  return false;
}
