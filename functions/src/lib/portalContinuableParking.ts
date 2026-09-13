import {
  FieldValue,
  type DocumentReference,
  type DocumentSnapshot,
  type QueryDocumentSnapshot,
  type Transaction,
} from "firebase-admin/firestore";

import { isPortalEditablePrintRequest } from "../../../packages/shared/src/utils/portalPrintRequestEditability";
import { PORTAL_PARKED_DRAFT_MUTATION_REJECTED_MESSAGE } from "../../../packages/shared/src/utils/portalActiveEditablePrintRequest";
import type { PrintRequestOrigin } from "../../../packages/shared/src/types/printRequest/printRequest.types";
import type { PrintRequestStatus } from "../../../packages/shared/src/types/printRequest/printRequest.enums";
import { failedPrecondition } from "./errors";

export interface ContinuableParkingDoc {
  id: string;
  ref: DocumentReference;
  status: PrintRequestStatus;
  customerId: string;
  itemCount: number;
  requestOrigin?: PrintRequestOrigin;
  isInternal: boolean;
  parkedByEditingRequestId?: string;
  parksDraftPrintRequestId?: string;
}

/**
 * Converts a QueryDocumentSnapshot array to ContinuableParkingDoc array.
 */
export function mapToContinuableParkingDocs(
  docs: QueryDocumentSnapshot[],
): ContinuableParkingDoc[] {
  return docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ref: doc.ref,
      status: (typeof data.status === "string" ? data.status : "draft") as PrintRequestStatus,
      customerId: typeof data.customerId === "string" ? data.customerId : "",
      itemCount: typeof data.itemCount === "number" ? data.itemCount : 0,
      requestOrigin: (typeof data.requestOrigin === "string" ? data.requestOrigin : undefined) as PrintRequestOrigin | undefined,
      isInternal: data.isInternal === true,
      parkedByEditingRequestId: typeof data.parkedByEditingRequestId === "string" ? data.parkedByEditingRequestId : undefined,
      parksDraftPrintRequestId: typeof data.parksDraftPrintRequestId === "string" ? data.parksDraftPrintRequestId : undefined,
    };
  });
}

/**
 * Asserts that two requests are eligible for the same customer park operation.
 * Validates same customerId, both not internal, and draft is portal-editable.
 */
export function assertSameCustomerParkEligible(
  editing: ContinuableParkingDoc,
  draft: ContinuableParkingDoc,
): void {
  if (editing.customerId !== draft.customerId) {
    throw failedPrecondition("Requests must belong to the same customer for parking operations.");
  }

  if (editing.isInternal || draft.isInternal) {
    throw failedPrecondition("Cannot park internal requests.");
  }

  if (!isPortalEditablePrintRequest({
    status: draft.status,
    requestOrigin: draft.requestOrigin,
    isInternal: draft.isInternal,
  })) {
    throw failedPrecondition("Draft request is not portal-editable for parking.");
  }
}

export interface ParkOrCleanupInput {
  customerId: string;
  editingRequestRef: DocumentReference;
  editingPrintRequestId: string;
  actorId: string;
  otherContinuableDocs: ContinuableParkingDoc[];
}

export interface ParkOrCleanupResult {
  parkedDraftId: string | null;
  archivedEmptyDraftIds: string[];
}

/**
 * Applies park or cleanup logic to other Continuable requests in a transaction.
 * For each other Continuable (excluding editingPrintRequestId):
 * 1. If status === "editing" → throw conflict
 * 2. If already parked → throw conflict
 * 3. If draft with 0 items → archive
 * 4. If draft with >0 items → park (only one meaningful draft allowed)
 * 5. Ignore non-portal-editable or throw for studio_customer conflicts
 */
export function applyParkOrCleanupOtherContinuablesInTransaction(
  transaction: Transaction,
  input: ParkOrCleanupInput,
): ParkOrCleanupResult {
  const { editingPrintRequestId, actorId, otherContinuableDocs } = input;
  
  const result: ParkOrCleanupResult = {
    parkedDraftId: null,
    archivedEmptyDraftIds: [],
  };

  let meaningfulDraftCount = 0;
  let parkedDraftId: string | null = null;

  for (const doc of otherContinuableDocs) {
    // Skip the editing request itself
    if (doc.id === editingPrintRequestId) {
      continue;
    }

    // Check for conflicts first
    if (doc.status === "editing") {
      throw failedPrecondition("Another request is already being edited.");
    }

    if (doc.parkedByEditingRequestId) {
      throw failedPrecondition("Another request is already parked by a different editing request.");
    }

    // Only process portal-editable continuables
    if (!isPortalEditablePrintRequest({
      status: doc.status as PrintRequestStatus,
      requestOrigin: doc.requestOrigin,
      isInternal: doc.isInternal,
    })) {
      // Check for studio_customer conflicts that shouldn't be silently ignored
      if (doc.requestOrigin === "studio_customer" && !doc.isInternal) {
        throw failedPrecondition("Cannot park while studio customer requests exist.");
      }
      continue; // Ignore other non-portal-editable requests
    }

    if (doc.status === "draft") {
      if (doc.itemCount === 0) {
        // Archive empty drafts
        transaction.update(doc.ref, {
          status: "archived",
          updatedBy: actorId,
          updatedAt: FieldValue.serverTimestamp(),
        });
        result.archivedEmptyDraftIds.push(doc.id);
      } else {
        // Park meaningful drafts
        meaningfulDraftCount++;
        if (meaningfulDraftCount > 1) {
          throw failedPrecondition("Cannot have more than one meaningful draft to park.");
        }
        
        transaction.update(doc.ref, {
          parkedByEditingRequestId: editingPrintRequestId,
          parkedAt: FieldValue.serverTimestamp(),
          updatedBy: actorId,
          updatedAt: FieldValue.serverTimestamp(),
        });
        parkedDraftId = doc.id;
      }
    }
  }

  result.parkedDraftId = parkedDraftId;
  return result;
}

export interface RestoreParkedDraftInput {
  editingRequestRef: DocumentReference;
  editingData: {
    parksDraftPrintRequestId?: string;
    status: string;
  };
  actorId: string;
  /**
   * When true (default), clear `parksDraftPrintRequestId` on the editing request.
   * Set false when the caller merges that clear into its own request update.
   */
  clearEditingParkingFields?: boolean;
}

export type ParkedDraftRestoreRead = {
  parksDraftPrintRequestId: string;
  parkedDraftSnap: DocumentSnapshot;
};

/**
 * Read phase for restore — must run before any transaction writes.
 */
export async function readParkedDraftForRestoreInTransaction(
  transaction: Transaction,
  editingRequestRef: DocumentReference,
  parksDraftPrintRequestId: string | undefined,
): Promise<ParkedDraftRestoreRead | null> {
  const parkedId =
    typeof parksDraftPrintRequestId === "string" ? parksDraftPrintRequestId.trim() : "";
  if (!parkedId) {
    return null;
  }

  const parkedDraftRef = editingRequestRef.firestore.collection("printRequests").doc(parkedId);
  const parkedDraftSnap = await transaction.get(parkedDraftRef);
  return { parksDraftPrintRequestId: parkedId, parkedDraftSnap };
}

/**
 * Write phase for restore — only call after all transaction reads are complete.
 * Returns the restored draft id, or null when there was nothing valid to restore.
 */
export function applyRestoreParkedDraftWritesInTransaction(
  transaction: Transaction,
  input: {
    editingRequestRef: DocumentReference;
    restoreRead: ParkedDraftRestoreRead | null;
    actorId: string;
    clearEditingParkingFields?: boolean;
  },
): string | null {
  const { editingRequestRef, restoreRead, actorId } = input;
  const clearEditingParkingFields = input.clearEditingParkingFields !== false;

  if (!restoreRead) {
    return null;
  }

  const { parksDraftPrintRequestId, parkedDraftSnap } = restoreRead;

  if (!parkedDraftSnap.exists) {
    if (clearEditingParkingFields) {
      transaction.update(editingRequestRef, {
        parksDraftPrintRequestId: FieldValue.delete(),
        updatedBy: actorId,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    return null;
  }

  const parkedData = parkedDraftSnap.data() ?? {};
  const parkedByEditingRequestId =
    typeof parkedData.parkedByEditingRequestId === "string"
      ? parkedData.parkedByEditingRequestId
      : undefined;

  if (parkedByEditingRequestId !== editingRequestRef.id) {
    if (clearEditingParkingFields) {
      transaction.update(editingRequestRef, {
        parksDraftPrintRequestId: FieldValue.delete(),
        updatedBy: actorId,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    return null;
  }

  transaction.update(parkedDraftSnap.ref, {
    parkedByEditingRequestId: FieldValue.delete(),
    parkedAt: FieldValue.delete(),
    updatedBy: actorId,
    updatedAt: FieldValue.serverTimestamp(),
  });

  if (clearEditingParkingFields) {
    transaction.update(editingRequestRef, {
      parksDraftPrintRequestId: FieldValue.delete(),
      updatedBy: actorId,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  return parksDraftPrintRequestId;
}

/**
 * Restores a parked draft in a transaction by clearing parking fields.
 * Returns the ID of the restored draft, or null if no draft to restore.
 *
 * IMPORTANT: Call only when no writes have occurred yet in this transaction
 * (Firestore requires all reads before all writes). Prefer explicit
 * `readParkedDraftForRestoreInTransaction` + `applyRestoreParkedDraftWritesInTransaction`
 * when the surrounding TX already performs other writes.
 */
export async function applyRestoreParkedDraftInTransaction(
  transaction: Transaction,
  input: RestoreParkedDraftInput,
): Promise<string | null> {
  const restoreRead = await readParkedDraftForRestoreInTransaction(
    transaction,
    input.editingRequestRef,
    input.editingData.parksDraftPrintRequestId,
  );
  return applyRestoreParkedDraftWritesInTransaction(transaction, {
    editingRequestRef: input.editingRequestRef,
    restoreRead,
    actorId: input.actorId,
    clearEditingParkingFields: input.clearEditingParkingFields,
  });
}

/**
 * Asserts that the request data represents an active editable Portal request.
 * Throws failedPrecondition with PORTAL_PARKED_DRAFT_MUTATION_REJECTED_MESSAGE if parked.
 */
export function assertPortalActiveEditableRequestData(
  data: { status?: string; parkedByEditingRequestId?: string },
  printRequestId: string,
): void {
  const status = typeof data.status === "string" ? data.status : "draft";
  
  // Check if it's a parked draft
  if (status === "draft" && data.parkedByEditingRequestId) {
    throw failedPrecondition(PORTAL_PARKED_DRAFT_MUTATION_REJECTED_MESSAGE);
  }

  // Check if status is valid for mutations that need a Continuable
  if (status !== "draft" && status !== "editing") {
    throw failedPrecondition(`Request ${printRequestId} is not in a continuable state (${status}).`);
  }
}