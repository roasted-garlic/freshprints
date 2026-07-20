import type { ShowProductionStatus } from "@fresh-prints/shared/types/upcomingShow/upcomingShow.enums";
import { assessShowCapacity } from "@fresh-prints/shared/utils/showCapacity";
import {
  formatShowCapacitySlotLabel,
  formatShowCapacitySlotLabelCompact,
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
  /**
   * Quantity that would be added if the current selection is confirmed (preview fill).
   * Drawn as a lighter segment on top of the committed fill.
   */
  pendingAllocatedByShowId?: ReadonlyMap<string, number>;
  isPastScheduled?: (show: ShowPickerSource) => boolean;
  /** When false, show remains on the calendar but cannot be selected (full / done / past). */
  canSelectShow?: (show: ShowPickerSource) => boolean;
  /**
   * Portal queue cutoff passed — badge CLOSED; not selectable.
   * Independent of Studio staff allocation eligibility.
   */
  isPastQueueCutoff?: (show: ShowPickerSource) => boolean;
  /** Compact countdown / closed copy + urgency for the capacity meta row. */
  getCutoffMeta?: (show: ShowPickerSource) =>
    | { label: string; shortLabel?: string; urgency: "success" | "warning" | "danger" }
    | undefined;
  /** @deprecated Prefer `getCutoffMeta`. */
  getCutoffMetaLabel?: (show: ShowPickerSource) => string | undefined;
  now?: Date;
}

/** Maps upcoming shows + capacity into `ShowPickerOption[]` for Studio or Portal. */
export function buildShowPickerOptions({
  shows,
  extraAllocatedByShowId,
  pendingAllocatedByShowId,
  isPastScheduled,
  canSelectShow,
  isPastQueueCutoff,
  getCutoffMeta,
  getCutoffMetaLabel,
}: BuildShowPickerOptionsInput): ShowPickerOption[] {
  return shows.map((show) => {
    const extraAllocated = extraAllocatedByShowId?.get(show.id) ?? 0;
    const pendingAllocated = pendingAllocatedByShowId?.get(show.id) ?? 0;
    const committedAllocated = show.allocatedQuantity + extraAllocated;
    const projectedAllocated = committedAllocated + pendingAllocated;
    const past = isPastScheduled?.(show) ?? false;
    const pastCutoff = isPastQueueCutoff?.(show) ?? false;

    const committedCapacity = assessShowCapacity({
      maxTotalQuantity: show.maxTotalQuantity,
      allocatedQuantity: committedAllocated,
    });
    const projectedCapacity = assessShowCapacity({
      maxTotalQuantity: show.maxTotalQuantity,
      allocatedQuantity: projectedAllocated,
    });
    const statusDisplay = getDerivedShowStatusDisplay(show.productionStatus, projectedCapacity, {
      isPastScheduled: past,
    });
    const capacityPercent = getShowCapacityPercent(projectedCapacity);
    const committedCapacityPercent = getShowCapacityPercent(committedCapacity);
    const selectableByCaller = canSelectShow?.(show) ?? true;
    const cutoffMeta = getCutoffMeta?.(show);
    const cutoffMetaLabel = cutoffMeta?.label ?? getCutoffMetaLabel?.(show);
    const cutoffMetaLabelShort = cutoffMeta?.shortLabel;
    const cutoffMetaUrgency = cutoffMeta?.urgency;

    return {
      id: show.id,
      scheduledAt: show.scheduledAt,
      timeLabel: show.scheduledAt ? formatShowTimeOnlyLabel(show.scheduledAt) : "No time set",
      capacityPercent,
      committedCapacityPercent:
        pendingAllocated > 0 ? committedCapacityPercent : undefined,
      capacityLabel: formatShowCapacitySlotLabel(projectedCapacity),
      capacityLabelShort: formatShowCapacitySlotLabelCompact(projectedCapacity),
      fillLevel: getCapacityFillLevel(capacityPercent),
      statusLabel: pastCutoff && !past ? "CLOSED" : statusDisplay.label,
      statusVariant: pastCutoff && !past ? "warning" : statusDisplay.variant,
      isFull: projectedCapacity.isFull,
      isOverCapacity: projectedCapacity.isOverCapacity,
      isSelectable: !past && !pastCutoff && selectableByCaller,
      ...(cutoffMetaLabel
        ? {
            cutoffMetaLabel,
            ...(cutoffMetaLabelShort ? { cutoffMetaLabelShort } : {}),
            ...(cutoffMetaUrgency ? { cutoffMetaUrgency } : {}),
          }
        : {}),
    };
  });
}
