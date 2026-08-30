import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { validateCustomerUsername } from "../../../packages/shared/src/utils/customerUsername";
import { adminDb } from "./admin";
import { appendUsernameHistory } from "./customerProfileUpdate";
import { alreadyExists, failedPrecondition, invalidArgument } from "./errors";
import { withoutUndefinedFields } from "./firestoreDocument";

export function buildMergeSourcePlaceholderUsername(customerId: string): string {
  const compactId = customerId.replace(/[^a-z0-9]/gi, "").toLowerCase().slice(0, 8);
  const suffix = compactId.length >= 6 ? compactId : customerId.replace(/-/g, "").slice(0, 8);
  const candidate = `merged-src-${suffix}`;
  const validated = validateCustomerUsername(candidate);

  if (!validated.isValid) {
    throw new Error("Unable to derive a safe merge placeholder username for the source account.");
  }

  return validated.username;
}

export interface MergeUsernameTransferTransactionInput {
  sourceCustomerId: string;
  survivorCustomerId: string;
  desiredUsername: string;
  callerId: string;
}

export interface MergeUsernameTransferTransactionResult {
  priorSourceUsername: string;
  priorSurvivorUsername: string;
  transferredUsername: string;
  sourcePlaceholderUsername: string;
}

export async function applyMergeSourcePlaceholderOnlyTransaction(input: {
  sourceCustomerId: string;
  callerId: string;
}): Promise<{ priorSourceUsername: string; sourcePlaceholderUsername: string }> {
  const sourceRef = adminDb.collection("customers").doc(input.sourceCustomerId);

  return adminDb.runTransaction(async (transaction) => {
    const sourceSnap = await transaction.get(sourceRef);

    if (!sourceSnap.exists) {
      throw invalidArgument("Source customer not found.");
    }

    const source = sourceSnap.data() ?? {};

    if (source.isDeleted === true || source.isMerged === true) {
      throw failedPrecondition("Source customer cannot be tombstoned or merged.");
    }

    const priorSourceUsername =
      typeof source.username === "string" ? source.username.trim().toLowerCase() : "";

    if (!priorSourceUsername) {
      return { priorSourceUsername: "", sourcePlaceholderUsername: "" };
    }

    const sourcePlaceholderUsername = buildMergeSourcePlaceholderUsername(input.sourceCustomerId);
    const priorReservationRef = adminDb.collection("customerUsernames").doc(priorSourceUsername);
    const placeholderReservationRef = adminDb
      .collection("customerUsernames")
      .doc(sourcePlaceholderUsername);

    const [priorReservationSnap, placeholderReservationSnap] = await Promise.all([
      transaction.get(priorReservationRef),
      transaction.get(placeholderReservationRef),
    ]);

    if (
      !priorReservationSnap.exists ||
      priorReservationSnap.data()?.customerId !== input.sourceCustomerId
    ) {
      throw failedPrecondition("Source username reservation changed since preview.");
    }

    if (
      placeholderReservationSnap.exists &&
      placeholderReservationSnap.data()?.customerId !== input.sourceCustomerId
    ) {
      throw alreadyExists("Unable to assign a safe placeholder username for the source account.");
    }

    const timestamp = FieldValue.serverTimestamp();
    const historyTimestamp = Timestamp.now();

    transaction.delete(priorReservationRef);
    transaction.set(
      placeholderReservationRef,
      {
        customerId: input.sourceCustomerId,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      { merge: true },
    );

    transaction.update(
      sourceRef,
      withoutUndefinedFields({
        username: sourcePlaceholderUsername,
        usernameUpdatedAt: timestamp,
        usernameHistory: appendUsernameHistory(
          source.usernameHistory,
          priorSourceUsername,
          historyTimestamp,
        ),
        updatedAt: timestamp,
      }),
    );

    return { priorSourceUsername, sourcePlaceholderUsername };
  });
}

export async function applyMergeUsernameTransferTransaction(
  input: MergeUsernameTransferTransactionInput,
): Promise<MergeUsernameTransferTransactionResult> {
  const desiredResult = validateCustomerUsername(input.desiredUsername);
  if (!desiredResult.isValid) {
    throw invalidArgument(desiredResult.error ?? "Enter a valid username to transfer.");
  }

  const desiredUsername = desiredResult.username;
  const sourceRef = adminDb.collection("customers").doc(input.sourceCustomerId);
  const survivorRef = adminDb.collection("customers").doc(input.survivorCustomerId);

  return adminDb.runTransaction(async (transaction) => {
    const [sourceSnap, survivorSnap] = await Promise.all([
      transaction.get(sourceRef),
      transaction.get(survivorRef),
    ]);

    if (!sourceSnap.exists || !survivorSnap.exists) {
      throw invalidArgument("Source or survivor customer not found.");
    }

    const source = sourceSnap.data() ?? {};
    const survivor = survivorSnap.data() ?? {};

    if (source.isDeleted === true || source.isMerged === true) {
      throw failedPrecondition("Source customer cannot be tombstoned or merged.");
    }

    if (survivor.isDeleted === true || survivor.isMerged === true) {
      throw failedPrecondition("Survivor customer cannot be tombstoned or merged.");
    }

    const priorSourceUsername =
      typeof source.username === "string" ? source.username.trim().toLowerCase() : "";
    const priorSurvivorUsername =
      typeof survivor.username === "string" ? survivor.username.trim().toLowerCase() : "";

    if (!priorSourceUsername) {
      throw failedPrecondition("Source customer username is missing.");
    }

    if (priorSourceUsername !== desiredUsername) {
      throw failedPrecondition(
        "Desired username no longer belongs to the source account. Run preview again.",
      );
    }

    const desiredReservationRef = adminDb.collection("customerUsernames").doc(desiredUsername);
    const desiredReservationSnap = await transaction.get(desiredReservationRef);

    if (
      !desiredReservationSnap.exists ||
      desiredReservationSnap.data()?.customerId !== input.sourceCustomerId
    ) {
      throw failedPrecondition(
        "Username reservation changed since preview. Run preview again before applying.",
      );
    }

    const sourcePlaceholderUsername = buildMergeSourcePlaceholderUsername(input.sourceCustomerId);
    const placeholderReservationRef = adminDb
      .collection("customerUsernames")
      .doc(sourcePlaceholderUsername);
    const placeholderReservationSnap = await transaction.get(placeholderReservationRef);

    if (
      placeholderReservationSnap.exists &&
      placeholderReservationSnap.data()?.customerId !== input.sourceCustomerId
    ) {
      throw alreadyExists("Unable to assign a safe placeholder username for the source account.");
    }

    const survivorOldReservationRef =
      priorSurvivorUsername && priorSurvivorUsername !== desiredUsername
        ? adminDb.collection("customerUsernames").doc(priorSurvivorUsername)
        : null;

    if (survivorOldReservationRef) {
      const survivorOldReservationSnap = await transaction.get(survivorOldReservationRef);
      if (
        survivorOldReservationSnap.exists &&
        survivorOldReservationSnap.data()?.customerId !== input.survivorCustomerId
      ) {
        throw failedPrecondition("Survivor username reservation is inconsistent.");
      }
    }

    const timestamp = FieldValue.serverTimestamp();
    const historyTimestamp = Timestamp.now();

    transaction.set(
      placeholderReservationRef,
      {
        customerId: input.sourceCustomerId,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      { merge: true },
    );

    transaction.set(
      desiredReservationRef,
      {
        customerId: input.survivorCustomerId,
        updatedAt: timestamp,
      },
      { merge: true },
    );

    if (survivorOldReservationRef) {
      transaction.delete(survivorOldReservationRef);
    }

    transaction.update(
      survivorRef,
      withoutUndefinedFields({
        username: desiredUsername,
        usernameUpdatedAt: timestamp,
        usernameHistory: appendUsernameHistory(
          survivor.usernameHistory,
          priorSurvivorUsername,
          historyTimestamp,
        ),
        updatedAt: timestamp,
      }),
    );

    transaction.update(
      sourceRef,
      withoutUndefinedFields({
        username: sourcePlaceholderUsername,
        usernameUpdatedAt: timestamp,
        usernameHistory: appendUsernameHistory(
          source.usernameHistory,
          priorSourceUsername,
          historyTimestamp,
        ),
        updatedAt: timestamp,
      }),
    );

    return {
      priorSourceUsername,
      priorSurvivorUsername,
      transferredUsername: desiredUsername,
      sourcePlaceholderUsername,
    };
  });
}
