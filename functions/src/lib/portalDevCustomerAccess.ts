import { FieldValue } from "firebase-admin/firestore";

import {
  PORTAL_DEV_CUSTOMER_ACCESS_ENFORCEMENT_PROJECT_ID,
  PORTAL_DEV_CUSTOMER_ACCESS_RESTRICTED_MESSAGE,
  PORTAL_DEV_CUSTOMER_ACCESS_SETTINGS_DOC_ID,
  isEmailInPortalDevCustomerAccessAllowlist,
  normalizePortalDevCustomerAccessEmails,
  type PortalDevCustomerAccessCheckResult,
  type PortalDevCustomerAccessSettings,
  type PortalDevCustomerAccessSettingsInput,
  resolvePortalDevCustomerAccessSettings,
} from "../../../packages/shared/src/constants/portal/portalDevCustomerAccess.constants";
import { adminDb } from "./admin";
import { permissionDenied } from "./errors";

const staffRoles = new Set(["owner", "admin", "helper"]);

const accessSettingsRef = () =>
  adminDb.collection("settings").doc(PORTAL_DEV_CUSTOMER_ACCESS_SETTINGS_DOC_ID);

/**
 * Resolve Functions runtime project id. Prefer GCLOUD_PROJECT, then GCP_PROJECT
 * (same pattern as other DEV-only gates in this codebase).
 */
export function resolvePortalDevCustomerAccessProjectId(
  env: NodeJS.ProcessEnv = process.env,
): string {
  return (
    env.GCLOUD_PROJECT?.trim() ||
    env.GCP_PROJECT?.trim() ||
    env.GOOGLE_CLOUD_PROJECT?.trim() ||
    ""
  ).trim();
}

/** True only on the development Firebase project. Production must short-circuit. */
export function isPortalDevCustomerAccessEnforcementEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return (
    resolvePortalDevCustomerAccessProjectId(env) ===
    PORTAL_DEV_CUSTOMER_ACCESS_ENFORCEMENT_PROJECT_ID
  );
}

export async function loadPortalDevCustomerAccessSettings(): Promise<PortalDevCustomerAccessSettings> {
  const snapshot = await accessSettingsRef().get();
  if (!snapshot.exists) {
    return { approvedEmails: [] };
  }
  return resolvePortalDevCustomerAccessSettings(snapshot.data());
}

export async function savePortalDevCustomerAccessSettings(
  input: PortalDevCustomerAccessSettingsInput,
  updatedBy: string,
): Promise<PortalDevCustomerAccessSettings> {
  const approvedEmails = normalizePortalDevCustomerAccessEmails(input.approvedEmails);

  await accessSettingsRef().set({
    approvedEmails,
    updatedBy,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return loadPortalDevCustomerAccessSettings();
}

function restrictedAccessError() {
  return permissionDenied(PORTAL_DEV_CUSTOMER_ACCESS_RESTRICTED_MESSAGE);
}

/** Pure decision helper for unit tests (no Firestore / env). */
export function decidePortalDevCustomerAccess(input: {
  enforcementEnabled: boolean;
  role?: unknown;
  email?: unknown;
  approvedEmails: readonly string[];
}): PortalDevCustomerAccessCheckResult {
  if (!input.enforcementEnabled) {
    return { allowed: true };
  }

  if (typeof input.role === "string" && staffRoles.has(input.role)) {
    return { allowed: true };
  }

  return {
    allowed: isEmailInPortalDevCustomerAccessAllowlist(input.approvedEmails, input.email),
  };
}

/**
 * DEV-only registration / alreadyProvisioned gate.
 * Production short-circuits (no-op). Does not delete Auth/customer records.
 */
export async function assertPortalDevCustomerAccessAllowsEmail(email: unknown): Promise<void> {
  if (!isPortalDevCustomerAccessEnforcementEnabled()) {
    return;
  }

  const settings = await loadPortalDevCustomerAccessSettings();
  const decision = decidePortalDevCustomerAccess({
    enforcementEnabled: true,
    email,
    approvedEmails: settings.approvedEmails,
  });
  if (!decision.allowed) {
    throw restrictedAccessError();
  }
}

export async function checkPortalDevCustomerAccessForCaller(input: {
  uid: string;
  email?: unknown;
  role?: unknown;
}): Promise<PortalDevCustomerAccessCheckResult> {
  if (!isPortalDevCustomerAccessEnforcementEnabled()) {
    return { allowed: true };
  }

  if (typeof input.role === "string" && staffRoles.has(input.role)) {
    return { allowed: true };
  }

  const settings = await loadPortalDevCustomerAccessSettings();
  return decidePortalDevCustomerAccess({
    enforcementEnabled: true,
    role: input.role,
    email: input.email,
    approvedEmails: settings.approvedEmails,
  });
}
