import type { GangSheetLayoutMode } from "@fresh-prints/shared/types/export/gangSheetExportIpc.types";

export const GANG_SHEET_LAYOUT_MODE_OPTIONS: Array<{
  hint: string;
  label: string;
  modalSummary: string;
  mode: GangSheetLayoutMode;
  titlePhrase: string;
}> = [
  {
    hint: "Pack all artwork for maximum sheet efficiency.",
    label: "Standard",
    modalSummary:
      "Creates gang sheet PNGs with every allocated design on them. Each sheet has one heading at the top — the show name.",
    mode: "efficiency",
    titlePhrase: "gang sheets",
  },
  {
    hint: "Keep each customer's requests together while allowing multiple customers to share a sheet.",
    label: "Grouped by Customer",
    modalSummary:
      "Same show heading on each sheet, plus a heading for each customer's print requests. Multiple customers can share one physical sheet when space allows.",
    mode: "customer_grouped_continuous",
    titlePhrase: "grouped continuous gang sheets",
  },
  {
    hint: "Create a separate gang-sheet set for each customer.",
    label: "Sheet per Customer",
    modalSummary:
      "Same show heading on each sheet, plus a heading for each customer's print requests. Each customer starts a new physical sheet set.",
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
