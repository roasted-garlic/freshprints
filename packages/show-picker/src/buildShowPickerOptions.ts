import type { ShowProductionStatus } from "@fresh-prints/shared/types/upcomingShow/upcomingShow.enums";
import { assessShowCapacity } from "@fresh-prints/shared/utils/showCapacity";
import {
  formatCapacityUsedLabel,
  formatSpotsRemainingLabel,
  getCapacityFillLevel,
  getDerivedShowStatusDisplay,
  getShowCapacityPercent,
} from "@fresh-prints/shared/utils/showCapacityDisplay";
import { formatShowTimeOnlyLabel } from "@fresh-prints/shared/utils/showDateTimeDisplay";

import type { ShowPickerOption } from "./types";

/** Minimal show fields required to render `ShowPicker` — Studio and Portal map their models to this. */
export interface ShowPickerSource {
  id: string;
  scheduledAt: Date | null;
  productionStatus: ShowProductionStatus;
  maxTotalQuantity?: number;
  allocatedQuantity: number;
}

export interface BuildShowPickerOptionsInput {
  shows: ShowPickerSource[];
  /** Extra quantity already staged for a show in the current session (e.g. split legs). */
  extraAllocatedByShowId?: ReadonlyMap<string, number>;
  isPastScheduled?: (show: ShowPickerSource) => boolean;
  now?: Date;
}

/** Maps upcoming shows + capacity into `ShowPickerOption[]` for Studio or Portal. */
export function buildShowPickerOptions({
  shows,
  extraAllocatedByShowId,
  isPastScheduled,
}: BuildShowPickerOptionsInput): ShowPickerOption[] {
  return shows.map((show) => {
    const extraAllocated = extraAllocatedByShowId?.get(show.id) ?? 0;
    const capacity = assessShowCapacity({
      maxTotalQuantity: show.maxTotalQuantity,
      allocatedQuantity: show.allocatedQuantity + extraAllocated,
    });
    const statusDisplay = getDerivedShowStatusDisplay(show.productionStatus, capacity, {
      isPastScheduled: isPastScheduled?.(show) ?? false,
    });
    const capacityPercent = getShowCapacityPercent(capacity);

    return {
      id: show.id,
      scheduledAt: show.scheduledAt,
      timeLabel: show.scheduledAt ? formatShowTimeOnlyLabel(show.scheduledAt) : "No time set",
      capacityPercent,
      capacityUsedLabel: formatCapacityUsedLabel(capacity),
      spotsRemainingLabel: formatSpotsRemainingLabel(capacity),
      fillLevel: getCapacityFillLevel(capacityPercent),
      statusLabel: statusDisplay.label,
      statusVariant: statusDisplay.variant,
      isFull: capacity.isFull,
      isOverCapacity: capacity.isOverCapacity,
    };
  });
}
