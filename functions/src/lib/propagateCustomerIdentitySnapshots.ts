import { FieldPath, FieldValue, Timestamp } from "firebase-admin/firestore";

import type { CustomerIdentitySnapshotPropagationStatus } from "../../../packages/shared/src/types/customer/customerIdentity.types";
import { adminDb } from "./admin";
import { withoutUndefinedDeep } from "./firestoreDocument";

export const IDENTITY_SNAPSHOT_BATCH_WRITE_LIMIT = 400;
export const MAX_PROPAGATION_BATCHES_PER_INVOCATION = 50;
const PROPAGATION_PAGE_SIZE = 200;

interface MutablePropagationState {
  status: CustomerIdentitySnapshotPropagationStatus;
  targetUsername: string;
  targetDisplayName: string;
  printRequestCursor?: string | null;
  designIssueReportCursor?: string | null;
  stage?: "printRequests" | "designIssueReports";
  printRequestsUpdated: number;
  designIssueReportsUpdated: number;
  startedAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  lastError?: string;
}

export interface IdentitySnapshotRecord {
  customerUsernameSnapshot?: string;
  customerDisplayNameSnapshot?: string;
  customerUsernameAtCreationSnapshot?: string;
  customerDisplayNameAtCreationSnapshot?: string;
  name?: string;
}

export interface IdentityPropagationTarget {
  username: string;
  displayName: string;
}

export interface PropagationRunResult {
  complete: boolean;
  status: CustomerIdentitySnapshotPropagationStatus;
  printRequestsUpdated: number;
  designIssueReportsUpdated: number;
}

function trimString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Pure idempotent field updates for one print request or design issue report.
 * Never mutates immutable print request `name`.
 */
export function buildIdentitySnapshotFieldUpdates(
  existing: IdentitySnapshotRecord,
  target: IdentityPropagationTarget,
): Record<string, string> | null {
  const updates: Record<string, string> = {};

  const previousUsername = trimString(existing.customerUsernameSnapshot);
  const previousDisplayName = trimString(existing.customerDisplayNameSnapshot);

  if (!trimString(existing.customerUsernameAtCreationSnapshot) && previousUsername) {
    updates.customerUsernameAtCreationSnapshot = previousUsername;
  }

  if (!trimString(existing.customerDisplayNameAtCreationSnapshot) && previousDisplayName) {
    updates.customerDisplayNameAtCreationSnapshot = previousDisplayName;
  }

  if (trimString(existing.customerUsernameSnapshot) !== target.username) {
    updates.customerUsernameSnapshot = target.username;
  }

  if (trimString(existing.customerDisplayNameSnapshot) !== target.displayName) {
    updates.customerDisplayNameSnapshot = target.displayName;
  }

  return Object.keys(updates).length > 0 ? updates : null;
}

function parsePropagationState(value: unknown): MutablePropagationState | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const state = value as MutablePropagationState;

  if (
    typeof state.targetUsername !== "string" ||
    typeof state.targetDisplayName !== "string" ||
    typeof state.status !== "string"
  ) {
    return null;
  }

  return state;
}

export async function initializeIdentitySnapshotPropagation(
  customerId: string,
  target: IdentityPropagationTarget,
): Promise<void> {
  const now = Timestamp.now();
  const customerRef = adminDb.collection("customers").doc(customerId);

  await customerRef.set(
    {
      identitySnapshotPropagation: {
        status: "in_progress",
        targetUsername: target.username,
        targetDisplayName: target.displayName,
        printRequestCursor: null,
        designIssueReportCursor: null,
        stage: "printRequests",
        printRequestsUpdated: 0,
        designIssueReportsUpdated: 0,
        startedAt: now,
        updatedAt: now,
      },
    },
    { merge: true },
  );
}

export function buildPersistedPropagationState(
  state: MutablePropagationState,
): Record<string, unknown> {
  const { lastError, updatedAt: _ignoredUpdatedAt, ...rest } = state;
  const payload: Record<string, unknown> = {
    ...withoutUndefinedDeep(rest),
    updatedAt: Timestamp.now(),
  };

  if (typeof lastError === "string" && lastError.trim()) {
    payload.lastError = lastError.trim();
  }

  return payload;
}

async function persistPropagationState(
  customerId: string,
  state: MutablePropagationState,
): Promise<void> {
  await adminDb.collection("customers").doc(customerId).set(
    {
      identitySnapshotPropagation: buildPersistedPropagationState(state),
    },
    { merge: true },
  );
}

async function processCollectionStage(input: {
  collectionName: "printRequests" | "designIssueReports";
  customerId: string;
  target: IdentityPropagationTarget;
  cursor: string | null | undefined;
  batchesRemaining: number;
}): Promise<{
  updatedCount: number;
  nextCursor: string | null;
  complete: boolean;
  batchesUsed: number;
  failed: boolean;
  lastError?: string;
}> {
  let updatedCount = 0;
  let batchesUsed = 0;
  let cursor = input.cursor ?? null;
  let complete = false;

  while (batchesUsed < input.batchesRemaining) {
    let query = adminDb
      .collection(input.collectionName)
      .where("customerId", "==", input.customerId)
      .orderBy(FieldPath.documentId())
      .limit(PROPAGATION_PAGE_SIZE);

    if (cursor) {
      query = query.startAfter(cursor);
    }

    const snapshot = await query.get();

    if (snapshot.empty) {
      complete = true;
      break;
    }

    let batch = adminDb.batch();
    let ops = 0;

    const commitBatch = async (force = false): Promise<boolean> => {
      if (ops === 0) {
        return false;
      }

      if (!force && ops < IDENTITY_SNAPSHOT_BATCH_WRITE_LIMIT) {
        return false;
      }

      await batch.commit();
      batch = adminDb.batch();
      ops = 0;
      batchesUsed += 1;
      return true;
    };

    try {
      for (const doc of snapshot.docs) {
        const updates = buildIdentitySnapshotFieldUpdates(
          doc.data() as IdentitySnapshotRecord,
          input.target,
        );

        if (updates) {
          batch.update(doc.ref, {
            ...updates,
            updatedAt: FieldValue.serverTimestamp(),
          });
          ops += 1;
          updatedCount += 1;
          await commitBatch();
        }

        cursor = doc.id;
      }

      await commitBatch(true);
    } catch (error) {
      const message =
        error instanceof Error ? error.message.slice(0, 240) : "Propagation batch failed.";

      return {
        updatedCount,
        nextCursor: cursor,
        complete: false,
        batchesUsed,
        failed: true,
        lastError: message,
      };
    }

    if (snapshot.size < PROPAGATION_PAGE_SIZE) {
      complete = true;
      break;
    }
  }

  return {
    updatedCount,
    nextCursor: complete ? null : cursor,
    complete,
    batchesUsed,
    failed: false,
  };
}

export async function propagateCustomerIdentitySnapshots(
  customerId: string,
  options?: { maxBatches?: number },
): Promise<PropagationRunResult> {
  const maxBatches = options?.maxBatches ?? MAX_PROPAGATION_BATCHES_PER_INVOCATION;
  const customerRef = adminDb.collection("customers").doc(customerId);
  const customerSnap = await customerRef.get();

  if (!customerSnap.exists) {
    return {
      complete: true,
      status: "completed",
      printRequestsUpdated: 0,
      designIssueReportsUpdated: 0,
    };
  }

  const customerData = customerSnap.data() ?? {};
  const canonicalUsername = trimString(customerData.username);
  const canonicalDisplayName = trimString(customerData.displayName) || "Customer";
  let state: MutablePropagationState =
    parsePropagationState(customerData.identitySnapshotPropagation) ??
    {
      status: "in_progress",
      targetUsername: canonicalUsername,
      targetDisplayName: canonicalDisplayName,
      printRequestCursor: null,
      designIssueReportCursor: null,
      stage: "printRequests",
      printRequestsUpdated: 0,
      designIssueReportsUpdated: 0,
      startedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

  if (
    state.targetUsername !== canonicalUsername ||
    state.targetDisplayName !== canonicalDisplayName
  ) {
    state = {
      status: "in_progress",
      targetUsername: canonicalUsername,
      targetDisplayName: canonicalDisplayName,
      printRequestCursor: null,
      designIssueReportCursor: null,
      stage: "printRequests",
      printRequestsUpdated: 0,
      designIssueReportsUpdated: 0,
      startedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
  }

  if (state.status === "completed") {
    return {
      complete: true,
      status: "completed",
      printRequestsUpdated: state.printRequestsUpdated,
      designIssueReportsUpdated: state.designIssueReportsUpdated,
    };
  }

  state.status = "in_progress";
  let batchesRemaining = maxBatches;
  const stage = state.stage ?? "printRequests";

  if (stage === "printRequests") {
    const printStage = await processCollectionStage({
      collectionName: "printRequests",
      customerId,
      target: {
        username: state.targetUsername,
        displayName: state.targetDisplayName,
      },
      cursor: state.printRequestCursor,
      batchesRemaining,
    });

    state.printRequestsUpdated += printStage.updatedCount;
    batchesRemaining -= printStage.batchesUsed;

    if (printStage.failed) {
      state.status = "failed";
      state.stage = "printRequests";
      state.printRequestCursor = printStage.nextCursor;
      state.lastError = printStage.lastError;
      await persistPropagationState(customerId, state);
      return {
        complete: false,
        status: "failed",
        printRequestsUpdated: state.printRequestsUpdated,
        designIssueReportsUpdated: state.designIssueReportsUpdated,
      };
    }

    if (!printStage.complete) {
      state.stage = "printRequests";
      state.printRequestCursor = printStage.nextCursor;
      await persistPropagationState(customerId, state);
      return {
        complete: false,
        status: "in_progress",
        printRequestsUpdated: state.printRequestsUpdated,
        designIssueReportsUpdated: state.designIssueReportsUpdated,
      };
    }

    state.stage = "designIssueReports";
    state.printRequestCursor = null;
    await persistPropagationState(customerId, state);
  }

  if (batchesRemaining <= 0) {
    return {
      complete: false,
      status: "in_progress",
      printRequestsUpdated: state.printRequestsUpdated,
      designIssueReportsUpdated: state.designIssueReportsUpdated,
    };
  }

  const reportStage = await processCollectionStage({
    collectionName: "designIssueReports",
    customerId,
    target: {
      username: state.targetUsername,
      displayName: state.targetDisplayName,
    },
    cursor: state.designIssueReportCursor,
    batchesRemaining,
  });

  state.designIssueReportsUpdated += reportStage.updatedCount;

  if (reportStage.failed) {
    state.status = "failed";
    state.designIssueReportCursor = reportStage.nextCursor;
    state.lastError = reportStage.lastError;
    await persistPropagationState(customerId, state);
    return {
      complete: false,
      status: "failed",
      printRequestsUpdated: state.printRequestsUpdated,
      designIssueReportsUpdated: state.designIssueReportsUpdated,
    };
  }

  if (!reportStage.complete) {
    state.status = "in_progress";
    state.designIssueReportCursor = reportStage.nextCursor;
    await persistPropagationState(customerId, state);
    return {
      complete: false,
      status: "in_progress",
      printRequestsUpdated: state.printRequestsUpdated,
      designIssueReportsUpdated: state.designIssueReportsUpdated,
    };
  }

  state.status = "completed";
  state.designIssueReportCursor = null;
  delete state.lastError;
  await persistPropagationState(customerId, state);

  return {
    complete: true,
    status: "completed",
    printRequestsUpdated: state.printRequestsUpdated,
    designIssueReportsUpdated: state.designIssueReportsUpdated,
  };
}

export async function resumeCustomerIdentitySnapshotPropagation(
  customerId: string,
  options?: { maxBatches?: number },
): Promise<PropagationRunResult> {
  return propagateCustomerIdentitySnapshots(customerId, options);
}

export async function runIdentityPropagationWithAutoResume(
  customerId: string,
): Promise<PropagationRunResult> {
  const firstPass = await propagateCustomerIdentitySnapshots(customerId);

  if (firstPass.complete) {
    return firstPass;
  }

  return resumeCustomerIdentitySnapshotPropagation(customerId);
}
