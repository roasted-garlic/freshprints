import type { UpcomingShow } from "@fresh-prints/shared/types/upcomingShow/upcomingShow.types";
import type { StaffInboxShowSnapshot } from "@fresh-prints/shared/staffInbox/staffInboxShowSnapshots";

import { mapFirestoreTimestamp } from "../../firebase/utils/firestoreTimestamp";

export function buildStaffInboxShowSnapshots(shows: UpcomingShow[]): StaffInboxShowSnapshot[] {
  return shows.map((show) => ({
    id: show.id,
    productionStatus: show.productionStatus,
    maxTotalQuantity: show.maxTotalQuantity,
    allocatedQuantity: show.allocatedQuantity,
    updatedAtMillis: mapFirestoreTimestamp(show.updatedAt)?.toMillis() ?? 0,
  }));
}
