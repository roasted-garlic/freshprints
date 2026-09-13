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

export function getShowAllocationStatusBadgeVariantForLabel(label: string) {
  switch (label.toLowerCase()) {
    case "done":
      return "success";
    case "printed":
    case "in_progress":
      return "info";
    case "queued":
      return "warning";
    case "released":
    case "canceled":
      return "danger";
    case "mixed":
      return "warning";
    default:
      return "default";
  }
}
