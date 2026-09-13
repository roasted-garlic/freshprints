/** Private Firestore `settings/{id}` document used by the Portal runtime brake. */
export const PORTAL_MAINTENANCE_SETTINGS_DOC_ID = "portalMaintenance";

export const PORTAL_MAINTENANCE_DEFAULT_HEADING = "We’re making a few improvements!";
export const PORTAL_MAINTENANCE_DEFAULT_MESSAGE =
  "The Fresh Prints Portal is taking a quick maintenance break. We’ll be back shortly. Thanks for hanging tight!";
export const PORTAL_MAINTENANCE_MAX_HEADING_LENGTH = 120;
export const PORTAL_MAINTENANCE_MAX_MESSAGE_LENGTH = 240;
export const PORTAL_MAINTENANCE_MAX_TEST_CUSTOMER_UID_LENGTH = 128;
export const PORTAL_MAINTENANCE_ACTIVE_ERROR_CODE = "PORTAL_MAINTENANCE_ACTIVE";
export const PORTAL_MAINTENANCE_STATE_ERROR_CODE = "PORTAL_MAINTENANCE_STATE_UNAVAILABLE";

export interface PortalMaintenanceSettings {
  enabled: boolean;
  heading?: string;
  message?: string;
  maintenanceTestCustomerUid?: string | null;
  updatedAt?: unknown;
  updatedBy?: string;
}

export interface PortalMaintenancePublicState {
  enabled: boolean;
  heading: string;
  message: string;
  maintenanceTestAccessGranted: boolean;
}

export interface PortalMaintenanceSettingsInput {
  enabled: boolean;
  heading?: string;
  message?: string;
  maintenanceTestCustomerUid?: string | null;
}

/** Owner/admin-only option metadata; never returned by the public Portal state callable. */
export interface PortalMaintenanceTestCustomerOption {
  uid: string;
  displayName: string;
  username?: string;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function normalizePortalMaintenanceMessage(value: unknown): string {
  if (typeof value !== "string") {
    return PORTAL_MAINTENANCE_DEFAULT_MESSAGE;
  }
  const message = value.trim().replace(/\s+/g, " ");
  if (!message || message.length > PORTAL_MAINTENANCE_MAX_MESSAGE_LENGTH) {
    return PORTAL_MAINTENANCE_DEFAULT_MESSAGE;
  }
  return message;
}

export function normalizePortalMaintenanceHeading(value: unknown): string {
  if (typeof value !== "string") {
    return PORTAL_MAINTENANCE_DEFAULT_HEADING;
  }
  const heading = value.trim().replace(/\s+/g, " ");
  if (!heading || heading.length > PORTAL_MAINTENANCE_MAX_HEADING_LENGTH) {
    return PORTAL_MAINTENANCE_DEFAULT_HEADING;
  }
  return heading;
}

export function parsePortalMaintenanceSettingsInput(
  value: unknown,
): PortalMaintenanceSettingsInput | null {
  if (!isPlainObject(value) || typeof value.enabled !== "boolean") {
    return null;
  }

  const heading = value.heading;
  if (heading !== undefined && heading !== null && typeof heading !== "string") {
    return null;
  }
  const normalizedHeading =
    heading === undefined || heading === null
      ? undefined
      : heading.trim().replace(/\s+/g, " ");
  if (normalizedHeading && normalizedHeading.length > PORTAL_MAINTENANCE_MAX_HEADING_LENGTH) {
    return null;
  }

  const message = value.message;
  if (message !== undefined && message !== null && typeof message !== "string") {
    return null;
  }
  const normalizedMessage =
    message === undefined || message === null
      ? undefined
      : message.trim().replace(/\s+/g, " ");
  if (normalizedMessage && normalizedMessage.length > PORTAL_MAINTENANCE_MAX_MESSAGE_LENGTH) {
    return null;
  }

  const testCustomerUid = value.maintenanceTestCustomerUid;
  if (
    testCustomerUid !== undefined &&
    testCustomerUid !== null &&
    (typeof testCustomerUid !== "string" ||
      testCustomerUid.trim().length === 0 ||
      testCustomerUid.trim().length > PORTAL_MAINTENANCE_MAX_TEST_CUSTOMER_UID_LENGTH)
  ) {
    return null;
  }
  const normalizedTestCustomerUid =
    typeof testCustomerUid === "string" ? testCustomerUid.trim() : testCustomerUid;

  return {
    enabled: value.enabled,
    ...(normalizedHeading ? { heading: normalizedHeading } : {}),
    ...(normalizedMessage ? { message: normalizedMessage } : {}),
    ...(normalizedTestCustomerUid !== undefined
      ? { maintenanceTestCustomerUid: normalizedTestCustomerUid }
      : {}),
  };
}

/** Client-safe normalization; server code uses strict validation before writes. */
export function resolvePortalMaintenanceSettings(value: unknown): PortalMaintenanceSettings {
  if (!isPlainObject(value) || typeof value.enabled !== "boolean") {
    return {
      enabled: false,
      heading: PORTAL_MAINTENANCE_DEFAULT_HEADING,
      message: PORTAL_MAINTENANCE_DEFAULT_MESSAGE,
    };
  }
  return {
    enabled: value.enabled,
    heading: normalizePortalMaintenanceHeading(value.heading),
    message: normalizePortalMaintenanceMessage(value.message),
    maintenanceTestCustomerUid:
      typeof value.maintenanceTestCustomerUid === "string"
        ? value.maintenanceTestCustomerUid.trim() || null
        : value.maintenanceTestCustomerUid === null
          ? null
          : undefined,
    updatedAt: value.updatedAt,
    updatedBy: typeof value.updatedBy === "string" ? value.updatedBy : undefined,
  };
}

export function toPortalMaintenancePublicState(
  settings: PortalMaintenanceSettings,
  maintenanceTestAccessGranted = false,
): PortalMaintenancePublicState {
  return {
    enabled: settings.enabled,
    heading: normalizePortalMaintenanceHeading(settings.heading),
    message: normalizePortalMaintenanceMessage(settings.message),
    maintenanceTestAccessGranted,
  };
}
