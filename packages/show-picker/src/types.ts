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
  /** Narrow-viewport capacity copy; CSS shows this under ~40rem when set. */
  capacityLabelShort?: string;
  fillLevel: ShowPickerFillLevel | undefined;
  statusLabel: string;
  statusVariant: ShowPickerStatusVariant;
  isFull: boolean;
  isOverCapacity: boolean;
  canInspect: boolean;
  canAllocate: boolean;
  /**
   * Compact Portal queue-cutoff hint on the capacity row (right-aligned).
   * Omitted when not applicable.
   */
  cutoffMetaLabel?: string;
  /** Narrow-viewport cutoff copy; CSS shows this under ~40rem when set. */
  cutoffMetaLabelShort?: string;
  /** Text color urgency for `cutoffMetaLabel`. */
  cutoffMetaUrgency?: "success" | "warning" | "danger";
}

export interface ShowPickerProps {
  options: ShowPickerOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onInspect?: (id: string) => void;
  inspectedId?: string | null;
  /** Clears an allocation destination while a display-only historical date is inspected. */
  onClearSelection?: () => void;
  now?: Date;
  className?: string;
}
