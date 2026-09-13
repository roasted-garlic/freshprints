import { isStaffGangSheetShow, type UpcomingShow } from "@fresh-prints/shared/types/upcomingShow/upcomingShow.types";

import type { InternalGangSheetSettings } from "../services/internalGangSheetSettingsService";
import type { GangSheetLayoutAndPricingSettingsInput } from "../services/gangSheetSettingsFields";
import type { ShowQueueSettings } from "../services/showQueueSettingsService";

/** Gang sheet export/layout uses Internal Gang Sheet settings for staff sheets; Show Queue settings for shows. */
export function resolveActiveGangSheetSettingsSource(
  show: Pick<UpcomingShow, "source"> | null | undefined,
  showQueueSettings: ShowQueueSettings,
  internalGangSheetSettings: InternalGangSheetSettings,
): GangSheetLayoutAndPricingSettingsInput {
  if (show && isStaffGangSheetShow(show)) {
    return internalGangSheetSettings;
  }

  return showQueueSettings;
}
