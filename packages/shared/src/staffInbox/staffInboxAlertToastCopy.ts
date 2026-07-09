import type { StaffInboxItemKind } from "./staffInbox.types";

export interface StaffInboxAlertToastCopy {
  message: string;
  title: string;
}

export function buildStaffInboxAlertToastCopy(
  kind: StaffInboxItemKind,
  name: string,
): StaffInboxAlertToastCopy {
  const trimmedName = name.trim() || "Unknown";

  if (kind === "portal_queued") {
    return {
      title: "Print request queued",
      message: trimmedName,
    };
  }

  return {
    title: "Show queue full",
    message: trimmedName,
  };
}
