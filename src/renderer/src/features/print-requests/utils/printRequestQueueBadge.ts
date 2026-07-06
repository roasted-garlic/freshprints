import type { BadgeVariant } from "../../../shared/components/Badge";
import type { PrintRequestQueueState } from "../../../../../../shared/utils/printRequestQueueState";

export function getPrintRequestQueueStateBadgeLabel(state: PrintRequestQueueState): string {
  switch (state) {
    case "not_queued":
      return "Working";
    case "partially_queued":
      return "Partially queued";
    case "queued":
      return "Queued";
    case "partially_printed":
      return "Partially printed";
    case "printed":
      return "Printed";
  }
}

export function getPrintRequestQueueStateBadgeVariant(state: PrintRequestQueueState): BadgeVariant {
  switch (state) {
    case "printed":
      return "success";
    case "partially_printed":
    case "queued":
      return "info";
    case "partially_queued":
      return "warning";
    case "not_queued":
    default:
      return "default";
  }
}
