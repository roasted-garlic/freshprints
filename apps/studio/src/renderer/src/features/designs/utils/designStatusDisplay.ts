import type { BadgeVariant } from "../../../shared/components/Badge";
import {
  type DesignStatus,
  isDeprecatedDesignStatus,
} from "../types/designStatus.types";

export function formatDesignStatusLabel(status: DesignStatus): string {
  if (isDeprecatedDesignStatus(status)) {
    return `${status.charAt(0).toUpperCase()}${status.slice(1)} (legacy)`;
  }

  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function getDesignStatusBadgeVariant(status: DesignStatus): BadgeVariant {
  switch (status) {
    case "ready":
      return "success";
    case "rejected":
      return "danger";
    case "imported":
    case "processing":
      return "warning";
    case "queued":
    case "printed":
      return "info";
    case "archived":
      return "default";
    default:
      return "default";
  }
}
