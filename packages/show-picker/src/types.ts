export type ShowPickerStatusVariant = "default" | "success" | "warning" | "danger" | "info";

export type ShowPickerFillLevel = "low" | "medium" | "high" | "critical";

export interface ShowPickerOption {
  id: string;
  /** Null when the show has no scheduled start time. */
  scheduledAt: Date | null;
  timeLabel: string;
  capacityPercent: number | undefined;
  capacityUsedLabel: string;
  spotsRemainingLabel: string;
  fillLevel: ShowPickerFillLevel | undefined;
  statusLabel: string;
  statusVariant: ShowPickerStatusVariant;
  isFull: boolean;
  isOverCapacity: boolean;
}

export interface ShowPickerProps {
  options: ShowPickerOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  now?: Date;
  className?: string;
}
