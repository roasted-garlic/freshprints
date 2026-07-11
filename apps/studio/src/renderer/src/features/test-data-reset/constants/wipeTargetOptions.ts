import type { OperationalWipeTarget } from "@fresh-prints/shared/types/admin/wipeOperationalTestData.types";

export interface OperationalWipeTargetOption {
  id: OperationalWipeTarget;
  label: string;
  description: string;
}

export const OPERATIONAL_WIPE_TARGET_OPTIONS: OperationalWipeTargetOption[] = [
  {
    id: "printRequests",
    label: "Print requests & items",
    description:
      "Deletes all print requests and line items. Also clears show-queue attachments, Firestore gang sheets, staff inbox Done history (staffInboxAcks), zeros each upcoming show’s allocatedQuantity (so Show Queue no longer looks filled), removes the counters/printRequests doc plus customer request sequences so names restart at …-CR001 / …-IR001, and clears this computer’s locally generated gang sheet PNG cache. Does not delete upcoming shows. Required before wiping designs.",
  },
  {
    id: "showQueueAttachments",
    label: "Show queue attachments only",
    description:
      "Deletes allocations, Firestore gang sheets, and staff inbox Done history, zeros each upcoming show’s allocatedQuantity, and clears this computer’s locally generated gang sheet PNG cache. Keeps print requests and upcoming show schedule entries.",
  },
  {
    id: "upcomingShows",
    label: "Upcoming shows",
    description:
      "Deletes upcoming shows, remaining allocations/Firestore gang sheets, and staff inbox Done history, and clears this computer’s locally generated gang sheet PNG cache. Keeps print requests.",
  },
  {
    id: "sequences",
    label: "Request name sequences",
    description:
      "Deletes counters/printRequests and resets each customer’s nextPrintRequestSequence to 1 / totalPrintRequests to 0. Always included when Print requests & items is selected.",
  },
  {
    id: "designRequestStats",
    label: "Design request stats",
    description:
      "Zeros design requestCount and clears lastRequestedAt on catalog designs. Skipped automatically if Designs is also selected.",
  },
  {
    id: "designs",
    label: "Designs (catalog + Storage)",
    description:
      "Deletes all design documents and Storage originals/thumbnails/previews. Automatically includes Print requests & items. Categories, tags, accounts, and settings are kept. Requires an extra confirmation modal.",
  },
];
