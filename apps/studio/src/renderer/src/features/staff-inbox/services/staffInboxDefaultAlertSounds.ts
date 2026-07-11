import defaultQueuedAlertUrl from "../../../../assets/sounds/inbox-alert-queued.mp3";
import defaultFullAlertUrl from "../../../../assets/sounds/inbox-alert-full.mp3";
import type { StaffInboxAlertSoundKind } from "../types/staffInboxAlertSettings.types";

export function getDefaultStaffInboxAlertSoundUrl(kind: StaffInboxAlertSoundKind): string {
  return kind === "request_queued_to_show" ? defaultQueuedAlertUrl : defaultFullAlertUrl;
}
