import { FieldValue } from "firebase-admin/firestore";

/** Admin SDK patch that removes staff re-queue markers from a print request. */
export function clearNeedsStaffRequeueAdminPatch(): Record<string, unknown> {
  return {
    needsStaffRequeueAt: FieldValue.delete(),
    needsStaffRequeueSourceShowId: FieldValue.delete(),
    needsStaffRequeueSourceShowTitleSnapshot: FieldValue.delete(),
    needsStaffRequeueReleasedQuantity: FieldValue.delete(),
  };
}
