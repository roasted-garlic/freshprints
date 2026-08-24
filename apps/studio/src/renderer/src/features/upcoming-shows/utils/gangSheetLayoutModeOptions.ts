import type { GangSheetLayoutMode } from "@fresh-prints/shared/types/export/gangSheetExportIpc.types";

export const GANG_SHEET_LAYOUT_MODE_OPTIONS: Array<{
  hint: string;
  label: string;
  modalSummary: string;
  mode: GangSheetLayoutMode;
  titlePhrase: string;
}> = [
  {
    hint: "One show heading on each sheet; all designs nested together.",
    label: "Standard",
    modalSummary:
      "Creates gang sheet PNGs with every allocated design on them. Each sheet has one heading at the top — the show name.",
    mode: "efficiency",
    titlePhrase: "gang sheets",
  },
  {
    hint: "Show heading plus a heading for each customer's print requests.",
    label: "Grouped by customer",
    modalSummary:
      "Same show heading on each sheet, plus an additional heading for each customer's print requests. Keeps each customer's designs together so you can find them quickly while prepping for the show.",
    mode: "grouped_by_customer",
    titlePhrase: "grouped gang sheets",
  },
];

export function getGangSheetLayoutModeOption(mode: GangSheetLayoutMode) {
  return (
    GANG_SHEET_LAYOUT_MODE_OPTIONS.find((option) => option.mode === mode) ??
    GANG_SHEET_LAYOUT_MODE_OPTIONS[0]!
  );
}
