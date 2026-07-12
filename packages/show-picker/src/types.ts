export type ShowPickerStatusVariant = "default" | "success" | "warning" | "danger" | "info";

export type ShowPickerFillLevel = "low" | "medium" | "high" | "critical";

export interface ShowPickerOption {
  id: string;
  /** Null when the show has no scheduled start time. */
  scheduledAt: Date | null;
  timeLabel: string;
  /** Projected fill percent (committed + pending preview). */
  capacityPercent: number | undefined;
  /**
   * Committed fill percent before pending preview. When set and lower than
   * `capacityPercent`, the picker draws a two-tone “filling” bar.
   */
  committedCapacityPercent?: number | undefined;
  capacityLabel: string;
  fillLevel: ShowPickerFillLevel | undefined;
  statusLabel: string;
  statusVariant: ShowPickerStatusVariant;
  isFull: boolean;
  isOverCapacity: boolean;
  /** False for past (or otherwise non-allocatable) shows — calendar highlight only. */
  isSelectable: boolean;
}

export interface ShowPickerProps {
  options: ShowPickerOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  now?: Date;
  className?: string;
}
