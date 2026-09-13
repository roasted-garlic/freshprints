import type { Timestamp } from "firebase/firestore";

import type { PrintRequest } from "../types/printRequest/printRequest.types";

export type NeedsStaffRequeueFields = Pick<
  PrintRequest,
  | "needsStaffRequeueAt"
  | "needsStaffRequeueSourceShowId"
  | "needsStaffRequeueSourceShowTitleSnapshot"
  | "needsStaffRequeueReleasedQuantity"
>;

export interface BuildNeedsStaffRequeuePatchInput {
  sourceShowId: string;
  sourceShowTitleSnapshot: string;
  releasedQuantity: number;
  /** Client or Admin Firestore timestamp — only persisted shape matters at write time. */
  markedAt: Timestamp | { seconds: number; nanoseconds: number };
}

export function buildNeedsStaffRequeuePatch(
  input: BuildNeedsStaffRequeuePatchInput,
): NeedsStaffRequeueFields {
  const title =
    typeof input.sourceShowTitleSnapshot === "string" && input.sourceShowTitleSnapshot.trim()
      ? input.sourceShowTitleSnapshot.trim()
      : "Show";

  return {
    needsStaffRequeueAt: input.markedAt as Timestamp,
    needsStaffRequeueSourceShowId: input.sourceShowId,
    needsStaffRequeueSourceShowTitleSnapshot: title,
    needsStaffRequeueReleasedQuantity: Math.max(0, input.releasedQuantity),
  };
}

export function clearNeedsStaffRequeuePatch(): NeedsStaffRequeueFields {
  return {
    needsStaffRequeueAt: undefined,
    needsStaffRequeueSourceShowId: undefined,
    needsStaffRequeueSourceShowTitleSnapshot: undefined,
    needsStaffRequeueReleasedQuantity: undefined,
  };
}

export function hasNeedsStaffRequeueMarker(
  request: Pick<PrintRequest, "needsStaffRequeueAt">,
): boolean {
  return request.needsStaffRequeueAt != null;
}
