import type { ShowProductionStatus } from "../types/upcomingShow/upcomingShow.enums";

const LOCKED_PRODUCTION_STATUSES: ShowProductionStatus[] = ["printing", "fully_printed", "completed", "archived"];

/**
 * A Print Request's allocation on a show may only be removed (returning it to Working/editable)
 * while the show has not yet started printing. Once a show is printing or further along, removal
 * would silently break in-progress or historical production records, so it requires an approved
 * admin correction path instead of the normal remove/re-add flow.
 */
export function canRemoveRequestFromShow(showProductionStatus: ShowProductionStatus): boolean {
  return !LOCKED_PRODUCTION_STATUSES.includes(showProductionStatus);
}
