import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { randomUUID } from "node:crypto";

import type { DuplicateVerificationMode } from "../../../packages/shared/src/types/customer/customerDuplicateResolution.types";
import { adminDb } from "./admin";
import { failedPrecondition, invalidArgument } from "./errors";

const PREVIEW_TTL_MS = 15 * 60 * 1000;

export type CustomerIdentityPreviewOperation =
  | "hard_delete"
  | "duplicate_resolution"
  | "account_merge";

interface StoredCustomerIdentityPreviewBase {
  previewId: string;
  previewChecksum: string;
  createdBy: string;
  operation: CustomerIdentityPreviewOperation;
  expiresAt: Timestamp;
  usedAt?: Timestamp;
}

export interface StoredHardDeletePreview extends StoredCustomerIdentityPreviewBase {
  operation: "hard_delete";
  customerId: string;
}

export interface StoredDuplicateResolutionPreview extends StoredCustomerIdentityPreviewBase {
  operation: "duplicate_resolution";
  sourceCustomerId: string;
  survivorCustomerId: string;
  desiredUsername: string;
  verificationMode: DuplicateVerificationMode;
}

export interface StoredAccountMergePreview extends StoredCustomerIdentityPreviewBase {
  operation: "account_merge";
  sourceCustomerId: string;
  survivorCustomerId: string;
  useSourceUsername: boolean;
  plannedSurvivorUsername: string;
}

export async function storeCustomerIdentityPreview(
  input:
    | {
        customerId: string;
        previewChecksum: string;
        createdBy: string;
        operation: "hard_delete";
      }
    | {
        sourceCustomerId: string;
        survivorCustomerId: string;
        desiredUsername: string;
        verificationMode: DuplicateVerificationMode;
        previewChecksum: string;
        createdBy: string;
        operation: "duplicate_resolution";
      }
    | {
        sourceCustomerId: string;
        survivorCustomerId: string;
        useSourceUsername: boolean;
        plannedSurvivorUsername: string;
        previewChecksum: string;
        createdBy: string;
        operation: "account_merge";
      },
): Promise<{ previewId: string; previewExpiresAtMillis: number }> {
  const previewId = randomUUID();
  const expiresAtMillis = Date.now() + PREVIEW_TTL_MS;

  if (input.operation === "hard_delete") {
    await adminDb.collection("customerIdentityOperationPreviews").doc(previewId).set({
      previewId,
      customerId: input.customerId,
      previewChecksum: input.previewChecksum,
      createdBy: input.createdBy,
      operation: input.operation,
      expiresAt: Timestamp.fromMillis(expiresAtMillis),
      createdAt: FieldValue.serverTimestamp(),
    });
  } else if (input.operation === "duplicate_resolution") {
    await adminDb.collection("customerIdentityOperationPreviews").doc(previewId).set({
      previewId,
      sourceCustomerId: input.sourceCustomerId,
      survivorCustomerId: input.survivorCustomerId,
      desiredUsername: input.desiredUsername,
      verificationMode: input.verificationMode,
      previewChecksum: input.previewChecksum,
      createdBy: input.createdBy,
      operation: input.operation,
      expiresAt: Timestamp.fromMillis(expiresAtMillis),
      createdAt: FieldValue.serverTimestamp(),
    });
  } else {
    await adminDb.collection("customerIdentityOperationPreviews").doc(previewId).set({
      previewId,
      sourceCustomerId: input.sourceCustomerId,
      survivorCustomerId: input.survivorCustomerId,
      useSourceUsername: input.useSourceUsername,
      plannedSurvivorUsername: input.plannedSurvivorUsername.trim().toLowerCase(),
      previewChecksum: input.previewChecksum,
      createdBy: input.createdBy,
      operation: input.operation,
      expiresAt: Timestamp.fromMillis(expiresAtMillis),
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  return { previewId, previewExpiresAtMillis: expiresAtMillis };
}

export async function consumeCustomerIdentityPreview(
  input:
    | {
        previewId: string;
        customerId: string;
        previewChecksum: string;
        callerId: string;
        operation: "hard_delete";
      }
    | {
        previewId: string;
        sourceCustomerId: string;
        survivorCustomerId: string;
        desiredUsername: string;
        previewChecksum: string;
        callerId: string;
        operation: "duplicate_resolution";
      }
    | {
        previewId: string;
        sourceCustomerId: string;
        survivorCustomerId: string;
        useSourceUsername: boolean;
        plannedSurvivorUsername: string;
        previewChecksum: string;
        callerId: string;
        operation: "account_merge";
      },
): Promise<void> {
  const ref = adminDb.collection("customerIdentityOperationPreviews").doc(input.previewId);
  const snap = await ref.get();

  if (!snap.exists) {
    throw invalidArgument("Preview expired or invalid. Run preview again.");
  }

  const data = snap.data() ?? {};

  if (data.previewChecksum !== input.previewChecksum) {
    throw failedPrecondition(
      "Customer state changed since preview. Run preview again before applying.",
    );
  }

  if (data.operation !== input.operation) {
    throw invalidArgument("Preview operation mismatch.");
  }

  if (data.createdBy !== input.callerId) {
    throw invalidArgument("Preview was created by another staff member.");
  }

  if (data.usedAt) {
    throw failedPrecondition("This preview was already used.");
  }

  const expiresAt = data.expiresAt;
  if (expiresAt && typeof expiresAt.toMillis === "function" && expiresAt.toMillis() < Date.now()) {
    throw invalidArgument("Preview expired. Run preview again.");
  }

  if (input.operation === "hard_delete") {
    if (data.customerId !== input.customerId) {
      throw invalidArgument("Preview does not match the selected customer.");
    }
  } else if (input.operation === "duplicate_resolution") {
    if (data.sourceCustomerId !== input.sourceCustomerId) {
      throw invalidArgument("Preview does not match the selected source customer.");
    }
    if (data.survivorCustomerId !== input.survivorCustomerId) {
      throw invalidArgument("Preview does not match the selected survivor customer.");
    }
    if (data.desiredUsername !== input.desiredUsername.trim().toLowerCase()) {
      throw failedPrecondition("Desired username changed since preview. Run preview again.");
    }
  } else {
    if (data.sourceCustomerId !== input.sourceCustomerId) {
      throw invalidArgument("Preview does not match the selected source customer.");
    }
    if (data.survivorCustomerId !== input.survivorCustomerId) {
      throw invalidArgument("Preview does not match the selected survivor customer.");
    }
    if (data.useSourceUsername !== input.useSourceUsername) {
      throw failedPrecondition("Username choice changed since preview. Run preview again.");
    }
    if (
      data.plannedSurvivorUsername !== input.plannedSurvivorUsername.trim().toLowerCase()
    ) {
      throw failedPrecondition("Planned survivor username changed since preview. Run preview again.");
    }
  }

  await ref.set(
    {
      usedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}
