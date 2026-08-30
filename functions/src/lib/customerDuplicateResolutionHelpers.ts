import type {
  ContinuablePrintRequestSummary,
  DuplicateResolutionAuthProviderSummary,
  DuplicateResolutionCustomerIdentitySummary,
  DuplicateResolutionRecommendation,
  DuplicateResolutionUsernameReservationSummary,
} from "../../../packages/shared/src/types/customer/customerDuplicateResolution.types";
import type { DeletionBlocker } from "../../../packages/shared/src/types/deletion/deletion.types";
import { validateCustomerUsername } from "../../../packages/shared/src/utils/customerUsername";
import { adminAuth, adminDb } from "./admin";
import type { AuthIdentityEmailEvidence } from "./customerDuplicateVerification";
import type { CustomerEligibilitySnapshot } from "./customerAccountEligibility";
import type { CustomerHistoryBlockerCounts } from "./customerAccountEligibility";

export function blockerCountsRecord(
  counts: CustomerHistoryBlockerCounts,
): Record<string, number> {
  return { ...counts };
}

export async function loadAuthIdentityEmailEvidence(
  authUid: string | null,
): Promise<AuthIdentityEmailEvidence | null> {
  if (!authUid) {
    return null;
  }

  try {
    const user = await adminAuth.getUser(authUid);
    return {
      email: user.email ?? null,
      emailVerified: user.emailVerified ?? null,
    };
  } catch {
    return null;
  }
}

export async function loadDuplicateResolutionAuthProviders(
  authUid: string | null,
): Promise<DuplicateResolutionAuthProviderSummary[]> {
  if (!authUid) {
    return [];
  }

  try {
    const user = await adminAuth.getUser(authUid);
    return user.providerData.map((provider) => ({
      providerId: provider.providerId,
      email: provider.email ?? user.email ?? null,
      emailVerified:
        provider.providerId === "password" ? (user.emailVerified ?? null) : null,
    }));
  } catch {
    return [];
  }
}

export async function buildDuplicateResolutionCustomerIdentitySummary(
  snapshot: CustomerEligibilitySnapshot,
  customerEmail: string | null,
): Promise<DuplicateResolutionCustomerIdentitySummary> {
  const authProviders = await loadDuplicateResolutionAuthProviders(snapshot.authUid);

  return {
    customerId: snapshot.customerId,
    userId: snapshot.authUid,
    username: snapshot.username,
    displayName: snapshot.displayName,
    email: customerEmail,
    isDisabled: snapshot.isDisabled,
    isDeleted: snapshot.isDeleted,
    isMerged: snapshot.isMerged,
    authProviders,
  };
}

export async function loadCustomerDocumentEmail(customerId: string): Promise<string | null> {
  const snap = await adminDb.collection("customers").doc(customerId).get();
  const email = snap.data()?.email;
  return typeof email === "string" && email.trim() ? email.trim() : null;
}

export async function loadUsernameReservationOwner(username: string): Promise<string | null> {
  const validated = validateCustomerUsername(username);
  if (!validated.isValid) {
    return null;
  }

  const snap = await adminDb.collection("customerUsernames").doc(validated.username).get();
  if (!snap.exists) {
    return null;
  }

  const customerId = snap.data()?.customerId;
  return typeof customerId === "string" && customerId.trim() ? customerId.trim() : null;
}

export function buildUsernameReservationSummary(input: {
  desiredUsername: string;
  sourceCustomerId: string;
  survivorCustomerId: string;
  ownerCustomerId: string | null;
}): DuplicateResolutionUsernameReservationSummary {
  const desiredUsername = input.desiredUsername.trim().toLowerCase();

  return {
    desiredUsername,
    ownerCustomerId: input.ownerCustomerId,
    ownedBySource: input.ownerCustomerId === input.sourceCustomerId,
    ownedBySurvivor: input.ownerCustomerId === input.survivorCustomerId,
    ownedByThirdParty:
      Boolean(input.ownerCustomerId) &&
      input.ownerCustomerId !== input.sourceCustomerId &&
      input.ownerCustomerId !== input.survivorCustomerId,
  };
}

export function buildDuplicateResolutionRecommendation(input: {
  identityBlocked: boolean;
  continuableBlocked: boolean;
  verificationBlocked: boolean;
  reservationOwnedBySource: boolean;
  sourceIsDisabled: boolean;
  hasPreservedHistory: boolean;
}): DuplicateResolutionRecommendation {
  if (input.identityBlocked || input.verificationBlocked) {
    return "BLOCKED_IDENTITY_STATE";
  }

  if (input.continuableBlocked) {
    return "BLOCKED_CONTINUABLE_PRINT_REQUESTS";
  }

  if (input.hasPreservedHistory) {
    return "HISTORY_EXISTS_MERGE_REQUIRED";
  }

  if (input.sourceIsDisabled) {
    return "ELIGIBLE_FOR_TRANSFER_ONLY";
  }

  if (input.reservationOwnedBySource) {
    return "ELIGIBLE_FOR_TRANSFER_AND_DISABLE";
  }

  return "BLOCKED_IDENTITY_STATE";
}

export function buildDuplicateResolutionSummaryLines(input: {
  desiredUsername: string;
  priorSurvivorUsername: string | null;
  sourceIsDisabled: boolean;
}): string[] {
  const lines = [
    `@${input.desiredUsername} will move to Survivor`,
    "Survivor's current username will be released",
    "Source will receive an internal replacement username",
    "Historical customer records will NOT be merged",
  ];

  if (input.sourceIsDisabled) {
    lines.splice(3, 0, "Source account is already disabled (disable step skipped)");
  } else {
    lines.splice(3, 0, "Source account will be disabled");
  }

  if (input.priorSurvivorUsername && input.priorSurvivorUsername !== input.desiredUsername) {
    lines[1] = `@${input.priorSurvivorUsername} will be released from Survivor`;
  }

  return lines;
}

export function buildDuplicateResolutionBlockers(input: {
  sourceSnapshot: CustomerEligibilitySnapshot;
  survivorSnapshot: CustomerEligibilitySnapshot;
  continuableBlockers: Array<{ code: string; message: string }>;
  reservationSummary: DuplicateResolutionUsernameReservationSummary;
  verificationBlocked: boolean;
  verificationReasons: string[];
}): DeletionBlocker[] {
  const blockers: DeletionBlocker[] = [];

  for (const blocker of input.sourceSnapshot.blockers) {
    if (
      blocker.code === "tombstoned_customer" ||
      blocker.code === "merged_customer" ||
      blocker.code === "identity_operation_lock"
    ) {
      blockers.push({
        code: `source_${blocker.code}`,
        message: `Source account: ${blocker.message}`,
        count: blocker.count,
      });
    }
  }

  for (const blocker of input.survivorSnapshot.blockers) {
    if (
      blocker.code === "tombstoned_customer" ||
      blocker.code === "merged_customer" ||
      blocker.code === "identity_operation_lock"
    ) {
      blockers.push({
        code: `survivor_${blocker.code}`,
        message: `Survivor account: ${blocker.message}`,
        count: blocker.count,
      });
    }
  }

  for (const blocker of input.continuableBlockers) {
    blockers.push({
      code: blocker.code,
      message: blocker.message,
    });
  }

  if (!input.reservationSummary.ownedBySource) {
    blockers.push({
      code: "desired_username_not_owned_by_source",
      message:
        "The desired username is not currently reserved by the source account. Choose the account that owns the username as Source.",
    });
  }

  if (input.verificationBlocked) {
    for (const reason of input.verificationReasons) {
      blockers.push({
        code: "duplicate_verification_blocked",
        message: reason,
      });
    }
  }

  return blockers;
}

export function hasPreservedCustomerHistory(counts: CustomerHistoryBlockerCounts): boolean {
  return Object.values(counts).some((count) => count > 0);
}

export function formatContinuablePrintRequestBlockers(
  sourceContinuable: ContinuablePrintRequestSummary[],
  survivorContinuable: ContinuablePrintRequestSummary[],
): string[] {
  const lines: string[] = [];

  if (sourceContinuable.length > 0) {
    lines.push(
      `Source continuable requests: ${sourceContinuable.map((request) => `${request.name} (${request.id})`).join(", ")}`,
    );
  }

  if (survivorContinuable.length > 0) {
    lines.push(
      `Survivor continuable requests: ${survivorContinuable.map((request) => `${request.name} (${request.id})`).join(", ")}`,
    );
  }

  return lines;
}
