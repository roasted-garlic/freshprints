import { FieldValue, Timestamp } from "firebase-admin/firestore";

import {
  PORTAL_USERNAME_CHANGE_COOLDOWN_MS,
  USERNAME_HISTORY_MAX_ENTRIES,
} from "../../../packages/shared/src/types/customer/customerIdentity.types";
import {
  normalizeCustomerDisplayName,
} from "./customerUpdateValidation";
import { validateCustomerUsername } from "../../../packages/shared/src/utils/customerUsername";
import { adminDb } from "./admin";
import { alreadyExists, failedPrecondition, invalidArgument } from "./errors";
import { withoutUndefinedFields } from "./firestoreDocument";

export type CustomerProfileUpdateMode = "portal" | "staff";

export interface CustomerProfileUpdateInput {
  customerId: string;
  displayName: string;
  username: string;
  mode: CustomerProfileUpdateMode;
  callerId: string;
  email?: string;
  notes?: string;
}

export interface CustomerProfileUpdateResult {
  customerId: string;
  displayName: string;
  username: string;
  usernameChanged: boolean;
  displayNameChanged: boolean;
  emailChanged: boolean;
  identityChanged: boolean;
  linkedUserId?: string;
  previousUsername?: string;
}

interface CustomerRecord {
  userId?: string;
  displayName?: string;
  username?: string;
  email?: string;
  notes?: string;
  usernameUpdatedAt?: FirebaseFirestore.Timestamp;
  usernameHistory?: Array<{
    username: string;
    changedAt: FirebaseFirestore.Timestamp;
  }>;
}

export function formatPortalUsernameCooldownMessage(nextEligibleAt: Date): string {
  const formatted = nextEligibleAt.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

  return `You can change your username again on ${formatted}.`;
}

export function assertPortalUsernameChangeAllowed(
  usernameUpdatedAt: FirebaseFirestore.Timestamp | undefined,
  mode: CustomerProfileUpdateMode,
  usernameHistory:
    | Array<{
        username: string;
        changedAt: FirebaseFirestore.Timestamp;
      }>
    | undefined,
  nowMs = Date.now(),
): void {
  if (mode !== "portal" || !usernameUpdatedAt) {
    return;
  }

  // Signup sets an initial username only; the first self-service change is allowed
  // without cooldown. Cooldown starts after that first change (history entry exists).
  if (!usernameHistory?.length) {
    return;
  }

  const elapsedMs = nowMs - usernameUpdatedAt.toMillis();

  if (elapsedMs < PORTAL_USERNAME_CHANGE_COOLDOWN_MS) {
    const nextEligibleAt = new Date(usernameUpdatedAt.toMillis() + PORTAL_USERNAME_CHANGE_COOLDOWN_MS);
    throw failedPrecondition(formatPortalUsernameCooldownMessage(nextEligibleAt));
  }
}

export function appendUsernameHistory(
  existing:
    | Array<{
        username: string;
        changedAt: FirebaseFirestore.Timestamp;
      }>
    | undefined,
  previousUsername: string,
  changedAt: FirebaseFirestore.Timestamp,
): Array<{ username: string; changedAt: FirebaseFirestore.Timestamp }> {
  const next = [...(existing ?? []), { username: previousUsername, changedAt }];

  if (next.length <= USERNAME_HISTORY_MAX_ENTRIES) {
    return next;
  }

  return next.slice(next.length - USERNAME_HISTORY_MAX_ENTRIES);
}

export async function applyCustomerProfileUpdate(
  input: CustomerProfileUpdateInput,
): Promise<CustomerProfileUpdateResult> {
  const displayName = normalizeCustomerDisplayName(input.displayName);
  const usernameResult = validateCustomerUsername(input.username);

  if (!usernameResult.isValid) {
    throw invalidArgument(usernameResult.error ?? "Enter a valid customer username.");
  }

  if (!displayName || displayName.length < 2) {
    throw invalidArgument("Display name must be at least 2 characters.");
  }

  if (displayName.length > 80) {
    throw invalidArgument("Display name must be 80 characters or fewer.");
  }

  const username = usernameResult.username;
  const customerRef = adminDb.collection("customers").doc(input.customerId);
  const customerSnapshot = await customerRef.get();

  if (!customerSnapshot.exists) {
    throw invalidArgument("Customer not found.");
  }

  const current = customerSnapshot.data() as CustomerRecord;
  const previousUsername =
    typeof current.username === "string" ? current.username.trim().toLowerCase() : "";
  const previousDisplayName =
    typeof current.displayName === "string" ? current.displayName.trim() : "";
  const usernameChanged = previousUsername !== username;
  const displayNameChanged = previousDisplayName !== displayName;
  const emailChanged =
    typeof input.email === "string" &&
    (typeof current.email !== "string" || current.email.trim().toLowerCase() !== input.email);
  const identityChanged = usernameChanged || displayNameChanged;
  const linkedUserId = typeof current.userId === "string" ? current.userId : undefined;
  const timestamp = FieldValue.serverTimestamp();
  const historyTimestamp = Timestamp.now();

  if (usernameChanged) {
    assertPortalUsernameChangeAllowed(current.usernameUpdatedAt, input.mode, current.usernameHistory);
  }

  await adminDb.runTransaction(async (transaction) => {
    const usernameReservationRef = adminDb.collection("customerUsernames").doc(username);
    const reservationSnapshot = await transaction.get(usernameReservationRef);

    if (reservationSnapshot.exists && reservationSnapshot.data()?.customerId !== input.customerId) {
      throw alreadyExists("That customer username is already taken.");
    }

    const previousReservationRef =
      previousUsername && previousUsername !== username
        ? adminDb.collection("customerUsernames").doc(previousUsername)
        : null;

    const customerUpdates = withoutUndefinedFields({
      displayName,
      username,
      email: input.email,
      notes: input.notes,
      usernameUpdatedAt: usernameChanged ? timestamp : current.usernameUpdatedAt,
      usernameHistory: usernameChanged
        ? appendUsernameHistory(current.usernameHistory, previousUsername, historyTimestamp)
        : current.usernameHistory,
      updatedAt: timestamp,
    });

    transaction.update(customerRef, customerUpdates);

    if (usernameChanged) {
      transaction.set(
        usernameReservationRef,
        {
          customerId: input.customerId,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
        { merge: true },
      );

      if (previousReservationRef) {
        transaction.delete(previousReservationRef);
      }
    }

    if (linkedUserId && (emailChanged || displayNameChanged)) {
      const userRef = adminDb.collection("users").doc(linkedUserId);
      transaction.update(
        userRef,
        withoutUndefinedFields({
          email: input.email,
          displayName,
          updatedAt: timestamp,
          updatedBy: input.callerId,
        }),
      );
    }
  });

  return {
    customerId: input.customerId,
    displayName,
    username,
    usernameChanged,
    displayNameChanged,
    emailChanged,
    identityChanged,
    linkedUserId,
    previousUsername: previousUsername || undefined,
  };
}
