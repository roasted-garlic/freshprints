/** Permanent owner dismissal — hides an alert from Open even after ack removal. */
export interface StaffInboxSuppressionDocument {
  itemId: string;
  deletedByUserId: string;
  deletedByDisplayName?: string;
}

export function buildStaffInboxSuppressionDocId(itemId: string): string {
  return itemId.split(":").join("_");
}
