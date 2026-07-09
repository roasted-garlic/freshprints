import {
  DEFAULT_STAFF_INBOX_ALERT_SETTINGS,
  type StaffInboxAlertSettings,
  type StaffInboxAlertSettingsV1,
} from "../types/staffInboxAlertSettings.types";

const STORAGE_KEY_PREFIX = "fresh-prints-staff-inbox-alert-settings";

function getStorageKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}:${userId}`;
}

function migrateV1Settings(settings: StaffInboxAlertSettingsV1): StaffInboxAlertSettings {
  return {
    version: 2,
    soundsEnabled: settings.soundsEnabled,
    requestQueuedToShow: {
      kind: "url",
      value: settings.requestQueuedToShowSoundUrl,
    },
    showQueueFull: {
      kind: "url",
      value: settings.showQueueFullSoundUrl,
    },
  };
}

function isStaffInboxAlertSettingsV2(value: unknown): value is StaffInboxAlertSettings {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const settings = value as StaffInboxAlertSettings;

  return (
    settings.version === 2 &&
    typeof settings.soundsEnabled === "boolean" &&
    typeof settings.requestQueuedToShow?.kind === "string" &&
    typeof settings.requestQueuedToShow?.value === "string" &&
    typeof settings.showQueueFull?.kind === "string" &&
    typeof settings.showQueueFull?.value === "string"
  );
}

function isStaffInboxAlertSettingsV1(value: unknown): value is StaffInboxAlertSettingsV1 {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const settings = value as StaffInboxAlertSettingsV1;

  return (
    settings.version === 1 &&
    typeof settings.soundsEnabled === "boolean" &&
    typeof settings.requestQueuedToShowSoundUrl === "string" &&
    typeof settings.showQueueFullSoundUrl === "string"
  );
}

export function loadStaffInboxAlertSettings(userId: string): StaffInboxAlertSettings {
  if (!userId.trim()) {
    return DEFAULT_STAFF_INBOX_ALERT_SETTINGS;
  }

  try {
    const raw = localStorage.getItem(getStorageKey(userId));

    if (!raw) {
      return DEFAULT_STAFF_INBOX_ALERT_SETTINGS;
    }

    const parsed = JSON.parse(raw) as unknown;

    if (isStaffInboxAlertSettingsV2(parsed)) {
      return parsed;
    }

    if (isStaffInboxAlertSettingsV1(parsed)) {
      return migrateV1Settings(parsed);
    }

    return DEFAULT_STAFF_INBOX_ALERT_SETTINGS;
  } catch {
    return DEFAULT_STAFF_INBOX_ALERT_SETTINGS;
  }
}

export function saveStaffInboxAlertSettings(
  userId: string,
  settings: StaffInboxAlertSettings,
): StaffInboxAlertSettings {
  if (!userId.trim()) {
    return settings;
  }

  try {
    localStorage.setItem(getStorageKey(userId), JSON.stringify(settings));
  } catch {
    // Ignore storage failures.
  }

  return settings;
}
