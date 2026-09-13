import { FieldValue } from "firebase-admin/firestore";

import {
  PORTAL_MAINTENANCE_ACTIVE_ERROR_CODE,
  PORTAL_MAINTENANCE_DEFAULT_HEADING,
  PORTAL_MAINTENANCE_DEFAULT_MESSAGE,
  PORTAL_MAINTENANCE_MAX_HEADING_LENGTH,
  PORTAL_MAINTENANCE_MAX_TEST_CUSTOMER_UID_LENGTH,
  PORTAL_MAINTENANCE_SETTINGS_DOC_ID,
  PORTAL_MAINTENANCE_STATE_ERROR_CODE,
  normalizePortalMaintenanceMessage,
  normalizePortalMaintenanceHeading,
  type PortalMaintenancePublicState,
  type PortalMaintenanceTestCustomerOption,
  type PortalMaintenanceSettings,
  type PortalMaintenanceSettingsInput,
  toPortalMaintenancePublicState,
} from "../../../packages/shared/src/constants/portal/portalMaintenance.constants";
import { adminDb } from "./admin";
import { failedPrecondition, invalidArgument, unavailable } from "./errors";

const maintenanceSettingsRef = () =>
  adminDb.collection("settings").doc(PORTAL_MAINTENANCE_SETTINGS_DOC_ID);

export type PortalMaintenanceStateReadFailureKind = "read_error" | "malformed";

export class PortalMaintenanceStateReadError extends Error {
  constructor(
    readonly kind: PortalMaintenanceStateReadFailureKind,
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "PortalMaintenanceStateReadError";
  }
}

function isValidMessage(value: unknown): value is string {
  return (
    value === undefined ||
    value === null ||
    (typeof value === "string" &&
      value.trim().length > 0 &&
      value.trim().length <= 240)
  );
}

function isValidHeading(value: unknown): value is string {
  return (
    value === undefined ||
    value === null ||
    (typeof value === "string" &&
      value.trim().length > 0 &&
      value.trim().length <= PORTAL_MAINTENANCE_MAX_HEADING_LENGTH)
  );
}

function isValidTestCustomerUid(value: unknown): value is string | null | undefined {
  return (
    value === undefined ||
    value === null ||
    (typeof value === "string" &&
      value.trim().length > 0 &&
      value.trim().length <= PORTAL_MAINTENANCE_MAX_TEST_CUSTOMER_UID_LENGTH)
  );
}

function readStrictState(data: Record<string, unknown> | undefined): PortalMaintenanceSettings {
  if (
    !data ||
    typeof data.enabled !== "boolean" ||
    !isValidHeading(data.heading) ||
    !isValidMessage(data.message) ||
    !isValidTestCustomerUid(data.maintenanceTestCustomerUid)
  ) {
    throw new PortalMaintenanceStateReadError(
      "malformed",
      "Portal maintenance settings are malformed.",
    );
  }

  return {
    enabled: data.enabled,
    heading: normalizePortalMaintenanceHeading(data.heading),
    message: normalizePortalMaintenanceMessage(data.message),
    maintenanceTestCustomerUid:
      typeof data.maintenanceTestCustomerUid === "string"
        ? data.maintenanceTestCustomerUid.trim()
        : data.maintenanceTestCustomerUid,
    updatedAt: data.updatedAt,
    updatedBy: typeof data.updatedBy === "string" ? data.updatedBy : undefined,
  };
}

/**
 * Read the emergency-brake document without caching. Missing is intentionally OFF so the
 * capability can be deployed disabled and preserve existing behavior.
 */
export async function loadPortalMaintenanceState(): Promise<PortalMaintenanceSettings> {
  let snapshot;
  try {
    snapshot = await maintenanceSettingsRef().get();
  } catch (error) {
    throw new PortalMaintenanceStateReadError(
      "read_error",
      "Portal maintenance settings could not be read.",
      error,
    );
  }

  if (!snapshot.exists) {
    return {
      enabled: false,
      heading: PORTAL_MAINTENANCE_DEFAULT_HEADING,
      message: PORTAL_MAINTENANCE_DEFAULT_MESSAGE,
    };
  }

  return readStrictState(snapshot.data());
}

function isEligibleCustomerRecord(data: Record<string, unknown>): boolean {
  return (
    data.isGuest !== true &&
    data.isDeleted !== true &&
    data.isDisabled !== true &&
    data.isMerged !== true &&
    !(
      typeof data.mergedIntoCustomerId === "string" &&
      data.mergedIntoCustomerId.trim()
    )
  );
}

function isEligibleCustomerUser(data: Record<string, unknown> | undefined): boolean {
  return Boolean(
    data &&
      data.role === "customer" &&
      data.isActive === true &&
      data.isDeleted !== true,
  );
}

async function loadActiveLinkedMaintenanceTester(
  uid: string,
): Promise<PortalMaintenanceTestCustomerOption | null> {
  const userSnapshot = await adminDb.collection("users").doc(uid).get();
  const user = userSnapshot.data();
  if (!userSnapshot.exists || !isEligibleCustomerUser(user)) {
    return null;
  }

  const customerSnapshot = await adminDb
    .collection("customers")
    .where("userId", "==", uid)
    .get();
  if (customerSnapshot.size !== 1) {
    return null;
  }

  const customer = customerSnapshot.docs[0].data() as Record<string, unknown>;
  if (!isEligibleCustomerRecord(customer)) {
    return null;
  }

  const displayName =
    typeof customer.displayName === "string" && customer.displayName.trim()
      ? customer.displayName.trim()
      : typeof user?.displayName === "string" && user.displayName.trim()
        ? user.displayName.trim()
        : "Customer";
  const username =
    typeof customer.username === "string" && customer.username.trim()
      ? customer.username.trim()
      : undefined;

  return {
    uid,
    displayName,
    ...(username ? { username } : {}),
  };
}

async function isActiveLinkedCustomer(uid: string): Promise<boolean> {
  return (await loadActiveLinkedMaintenanceTester(uid)) !== null;
}

export async function listActiveLinkedMaintenanceTestCustomers(): Promise<
  PortalMaintenanceTestCustomerOption[]
> {
  const snapshot = await adminDb.collection("customers").get();
  const candidateUids = [
    ...new Set(
      snapshot.docs
        .map((customer) => customer.data().userId)
        .filter((uid): uid is string => typeof uid === "string" && uid.trim().length > 0),
    ),
  ];
  const candidates = await Promise.all(
    candidateUids.map((uid) => loadActiveLinkedMaintenanceTester(uid)),
  );

  return candidates
    .filter((candidate): candidate is PortalMaintenanceTestCustomerOption => candidate !== null)
    .sort((left, right) => left.displayName.localeCompare(right.displayName));
}

async function validateConfiguredTester(uid: string): Promise<void> {
  if (!(await isActiveLinkedCustomer(uid))) {
    throw invalidArgument("Choose an active, linked customer account for maintenance testing.");
  }
}

export function isPortalMaintenanceTestAccessGranted(
  state: PortalMaintenanceSettings,
  callerUid: string | undefined,
): boolean {
  return Boolean(
    state.enabled &&
      callerUid &&
      state.maintenanceTestCustomerUid &&
      state.maintenanceTestCustomerUid === callerUid,
  );
}

function maintenanceFailureDetails(code: string, outcome: PortalMaintenanceStateReadFailureKind | "enabled") {
  return { code, outcome };
}

/** Fail closed for any customer mutation when the state is ON or unreadable. */
export async function assertPortalMaintenanceAllowsCustomerMutation(callerUid: string): Promise<void> {
  let state: PortalMaintenanceSettings;
  try {
    state = await loadPortalMaintenanceState();
  } catch (error) {
    const failure =
      error instanceof PortalMaintenanceStateReadError ? error : undefined;
    console.error("Portal maintenance state read failed; blocking customer mutation.", {
      outcome: failure?.kind ?? "read_error",
      message: error instanceof Error ? error.message : "unknown",
    });
    throw failedPrecondition(
      "Portal customer actions are temporarily unavailable. Please try again shortly.",
      maintenanceFailureDetails(
        PORTAL_MAINTENANCE_STATE_ERROR_CODE,
        failure?.kind ?? "read_error",
      ),
    );
  }

  if (state.enabled && isPortalMaintenanceTestAccessGranted(state, callerUid)) {
    let testerIsEligible = false;
    try {
      testerIsEligible = await isActiveLinkedCustomer(callerUid);
    } catch (error) {
      console.error("Portal maintenance tester eligibility read failed; blocking customer mutation.", {
        outcome: "read_error",
        message: error instanceof Error ? error.message : "unknown",
      });
      throw failedPrecondition(
        "Portal customer actions are temporarily unavailable. Please try again shortly.",
        maintenanceFailureDetails(PORTAL_MAINTENANCE_STATE_ERROR_CODE, "read_error"),
      );
    }
    if (testerIsEligible) {
      return;
    }
  }

  if (state.enabled) {
    throw failedPrecondition(
      normalizePortalMaintenanceMessage(state.message),
      maintenanceFailureDetails(PORTAL_MAINTENANCE_ACTIVE_ERROR_CODE, "enabled"),
    );
  }
}

/** Public-safe read; private audit fields never leave this module. */
export async function loadPortalMaintenancePublicState(
  callerUid?: string,
): Promise<PortalMaintenancePublicState> {
  try {
    const state = await loadPortalMaintenanceState();
    const maintenanceTestAccessGranted =
      isPortalMaintenanceTestAccessGranted(state, callerUid) &&
      (await isActiveLinkedCustomer(callerUid as string));
    return toPortalMaintenancePublicState(state, maintenanceTestAccessGranted);
  } catch (error) {
    const failure =
      error instanceof PortalMaintenanceStateReadError ? error : undefined;
    console.error("Portal maintenance public-state read failed.", {
      outcome: failure?.kind ?? "read_error",
      message: error instanceof Error ? error.message : "unknown",
    });
    throw unavailable(
      "Portal maintenance status is temporarily unavailable. Please try again shortly.",
    );
  }
}

export async function savePortalMaintenanceState(
  input: PortalMaintenanceSettingsInput,
  updatedBy: string,
): Promise<PortalMaintenanceSettings> {
  const current = await loadPortalMaintenanceState();
  const maintenanceTestCustomerUid =
    input.maintenanceTestCustomerUid === undefined
      ? current.maintenanceTestCustomerUid
      : input.maintenanceTestCustomerUid;
  if (maintenanceTestCustomerUid) {
    await validateConfiguredTester(maintenanceTestCustomerUid);
  }

  await maintenanceSettingsRef().set({
    enabled: input.enabled,
    ...(input.heading ? { heading: input.heading } : {}),
    ...(input.message ? { message: input.message } : {}),
    ...(maintenanceTestCustomerUid
      ? { maintenanceTestCustomerUid }
      : {}),
    updatedBy,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return loadPortalMaintenanceState();
}
