import type { ShowAllocationStatus } from "@fresh-prints/shared/types/showAllocation/showAllocation.enums";

export function getShowAllocationStatusBadgeVariant(status: ShowAllocationStatus) {
  switch (status) {
    case "done":
      return "success";
    case "printed":
    case "in_progress":
      return "info";
    case "queued":
      return "warning";
    case "canceled":
      return "danger";
    case "pending":
    default:
      return "default";
  }
}
