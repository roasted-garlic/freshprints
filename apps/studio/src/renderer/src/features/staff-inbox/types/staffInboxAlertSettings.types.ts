export type StaffInboxAlertSoundKind = "request_queued_to_show" | "show_queue_full";

export type StaffInboxAlertSoundSourceKind = "default" | "local" | "url";

export interface StaffInboxAlertSoundSource {
  kind: StaffInboxAlertSoundSourceKind;
  /** URL string for online sounds, or saved local file name for desktop uploads. Empty when using default. */
  value: string;
}

export interface StaffInboxAlertSettingsV2 {
  requestQueuedToShow: StaffInboxAlertSoundSource;
  showQueueFull: StaffInboxAlertSoundSource;
  soundsEnabled: boolean;
  version: 2;
}

export interface StaffInboxAlertSettingsV1 {
  requestQueuedToShowSoundUrl: string;
  showQueueFullSoundUrl: string;
  soundsEnabled: boolean;
  version: 1;
}

export type StaffInboxAlertSettings = StaffInboxAlertSettingsV2;

export const EMPTY_STAFF_INBOX_ALERT_SOUND_SOURCE: StaffInboxAlertSoundSource = {
  kind: "default",
  value: "",
};

export const DEFAULT_STAFF_INBOX_ALERT_SETTINGS: StaffInboxAlertSettings = {
  version: 2,
  soundsEnabled: true,
  requestQueuedToShow: { ...EMPTY_STAFF_INBOX_ALERT_SOUND_SOURCE },
  showQueueFull: { ...EMPTY_STAFF_INBOX_ALERT_SOUND_SOURCE },
};

export function getStaffInboxAlertSoundSource(
  settings: StaffInboxAlertSettings,
  kind: StaffInboxAlertSoundKind,
): StaffInboxAlertSoundSource {
  return kind === "request_queued_to_show" ? settings.requestQueuedToShow : settings.showQueueFull;
}

export function setStaffInboxAlertSoundSource(
  settings: StaffInboxAlertSettings,
  kind: StaffInboxAlertSoundKind,
  source: StaffInboxAlertSoundSource,
): StaffInboxAlertSettings {
  if (kind === "request_queued_to_show") {
    return { ...settings, requestQueuedToShow: source };
  }

  return { ...settings, showQueueFull: source };
}
