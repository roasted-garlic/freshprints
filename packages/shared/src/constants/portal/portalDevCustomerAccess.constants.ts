/** Private Firestore `settings/{id}` document for DEV Portal customer email allowlist. */
export const PORTAL_DEV_CUSTOMER_ACCESS_SETTINGS_DOC_ID = "portalDevCustomerAccess";

/** Firebase project id where customer allowlist enforcement is active. */
export const PORTAL_DEV_CUSTOMER_ACCESS_ENFORCEMENT_PROJECT_ID = "fresh-prints-dev";

export const PORTAL_DEV_CUSTOMER_ACCESS_MAX_EMAILS = 200;
export const PORTAL_DEV_CUSTOMER_ACCESS_MAX_EMAIL_LENGTH = 254;

export const PORTAL_DEV_CUSTOMER_ACCESS_RESTRICTED_ERROR_CODE =
  "PORTAL_DEV_CUSTOMER_ACCESS_RESTRICTED";

/** Generic copy — never enumerate allowlist membership. */
export const PORTAL_DEV_CUSTOMER_ACCESS_RESTRICTED_MESSAGE =
  "Access to this development Portal is restricted. Use MyPrintRequest.com for real print requests.";

/** Canonical production customer site for overlay / restricted-access guidance. */
export const PORTAL_PRODUCTION_CUSTOMER_SITE_URL = "https://MyPrintRequest.com";
export const PORTAL_PRODUCTION_CUSTOMER_SITE_HOST = "MyPrintRequest.com";

export interface PortalDevCustomerAccessSettings {
  approvedEmails: string[];
  updatedAt?: unknown;
  updatedBy?: string;
}

export interface PortalDevCustomerAccessSettingsInput {
  approvedEmails: string[];
}

export interface PortalDevCustomerAccessCheckResult {
  allowed: boolean;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Lowercase + trim; empty / non-string → "". */
export function normalizePortalDevCustomerAccessEmail(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim().toLowerCase();
}

/**
 * Normalize a list of emails: trim, lowercase, drop empties/invalids, de-dupe (first wins).
 */
export function normalizePortalDevCustomerAccessEmails(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const result: string[] = [];

  for (const entry of value) {
    const email = normalizePortalDevCustomerAccessEmail(entry);
    if (!email || email.length > PORTAL_DEV_CUSTOMER_ACCESS_MAX_EMAIL_LENGTH) {
      continue;
    }
    if (!email.includes("@") || email.startsWith("@") || email.endsWith("@")) {
      continue;
    }
    if (seen.has(email)) {
      continue;
    }
    seen.add(email);
    result.push(email);
    if (result.length >= PORTAL_DEV_CUSTOMER_ACCESS_MAX_EMAILS) {
      break;
    }
  }

  return result;
}

export function parsePortalDevCustomerAccessSettingsInput(
  value: unknown,
): PortalDevCustomerAccessSettingsInput | null {
  if (!isPlainObject(value) || !Array.isArray(value.approvedEmails)) {
    return null;
  }

  if (value.approvedEmails.length > PORTAL_DEV_CUSTOMER_ACCESS_MAX_EMAILS) {
    return null;
  }

  for (const entry of value.approvedEmails) {
    if (typeof entry !== "string") {
      return null;
    }
    const trimmed = entry.trim();
    if (
      !trimmed ||
      trimmed.length > PORTAL_DEV_CUSTOMER_ACCESS_MAX_EMAIL_LENGTH ||
      !trimmed.includes("@") ||
      trimmed.startsWith("@") ||
      trimmed.endsWith("@")
    ) {
      return null;
    }
  }

  return {
    approvedEmails: normalizePortalDevCustomerAccessEmails(value.approvedEmails),
  };
}

/** Client-safe resolve; missing/malformed → empty allowlist. */
export function resolvePortalDevCustomerAccessSettings(
  value: unknown,
): PortalDevCustomerAccessSettings {
  if (!isPlainObject(value)) {
    return { approvedEmails: [] };
  }

  return {
    approvedEmails: normalizePortalDevCustomerAccessEmails(value.approvedEmails),
    ...(value.updatedAt !== undefined ? { updatedAt: value.updatedAt } : {}),
    ...(typeof value.updatedBy === "string" ? { updatedBy: value.updatedBy } : {}),
  };
}

export function isEmailInPortalDevCustomerAccessAllowlist(
  approvedEmails: readonly string[],
  email: unknown,
): boolean {
  const normalized = normalizePortalDevCustomerAccessEmail(email);
  if (!normalized) {
    return false;
  }
  return approvedEmails.includes(normalized);
}
