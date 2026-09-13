import type { BadgeVariant } from "../../../shared/components/Badge";
import type { PrintRequest } from "@fresh-prints/shared/types/printRequest/printRequest.types";
import { hasNeedsStaffRequeueMarker } from "@fresh-prints/shared/utils/printRequestStaffRequeue";

export function shouldShowPrintRequestRequeueBadge(
  request: Pick<PrintRequest, "needsStaffRequeueAt">,
): boolean {
  return hasNeedsStaffRequeueMarker(request);
}

export function getPrintRequestRequeueBadgeLabel(): string {
  return "NEEDS RE-QUEUE";
}

export function getPrintRequestRequeueBadgeVariant(): BadgeVariant {
  return "warning";
}

export function getPrintRequestRequeueBadgeTitle(
  request: Pick<
    PrintRequest,
    | "needsStaffRequeueSourceShowTitleSnapshot"
    | "needsStaffRequeueReleasedQuantity"
    | "needsStaffRequeueAt"
  >,
): string | undefined {
  if (!hasNeedsStaffRequeueMarker(request)) {
    return undefined;
  }

  const showTitle = request.needsStaffRequeueSourceShowTitleSnapshot?.trim() || "Show";
  const releasedQuantity = request.needsStaffRequeueReleasedQuantity ?? 0;
  return `Released from ${showTitle} — ${releasedQuantity} print${
    releasedQuantity === 1 ? "" : "s"
  } need staff re-queue`;
}
