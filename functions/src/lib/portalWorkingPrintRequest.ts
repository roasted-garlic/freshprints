import { FieldValue, type QueryDocumentSnapshot, type Transaction } from "firebase-admin/firestore";

import { formatCustomerPrintRequestName } from "../../../packages/shared/src/utils/printRequestNaming";
import { isPortalEditablePrintRequest } from "../../../packages/shared/src/utils/portalPrintRequestEditability";
import { requireValidCustomerUsername } from "../../../packages/shared/src/utils/customerUsername";
import { isPortalParkedDraft } from "../../../packages/shared/src/utils/portalActiveEditablePrintRequest";
import type { PrintRequestStatus } from "../../../packages/shared/src/types/printRequest/printRequest.enums";
import {
  PORTAL_MULTIPLE_WORKING_REQUESTS_MESSAGE,
  PORTAL_ONE_WORKING_REQUEST_MESSAGE,
} from "../../../packages/shared/src/utils/portalOneWorkingPrintRequest";

import { adminDb } from "./admin";
import { failedPrecondition, invalidArgument } from "./errors";

export interface WorkingPrintRequestCustomer {
  customerId: string;
  userId: string;
  username: string;
  displayName: string;
}

function resolveNextSequence(value: unknown): number {
  if (typeof value === "number" && Number.isInteger(value) && value >= 1) {
    return value;
  }
  return 1;
}

function continuableQuery(customerId: string) {
  return adminDb
    .collection("printRequests")
    .where("customerId", "==", customerId)
    .where("status", "in", ["draft", "editing"])
    .limit(2);
}

function filterPortalEditableContinuableDocs(
  docs: QueryDocumentSnapshot[],
): QueryDocumentSnapshot[] {
  return docs.filter((doc) =>
    isPortalEditablePrintRequest({
      status: doc.data().status,
      requestOrigin: doc.data().requestOrigin,
      isInternal: doc.data().isInternal,
    }),
  );
}

function countActiveEditableRequests(docs: QueryDocumentSnapshot[]): number {
  return docs.filter((doc) => {
    const data = doc.data();
    const status = (typeof data.status === "string" ? data.status : "draft") as PrintRequestStatus;
    const parkedByEditingRequestId = typeof data.parkedByEditingRequestId === "string" 
      ? data.parkedByEditingRequestId 
      : undefined;
    
    // Only count if portal-editable and not parked
    if (!isPortalEditablePrintRequest({
      status,
      requestOrigin: data.requestOrigin,
      isInternal: data.isInternal,
    })) {
      return false;
    }
    
    // Exclude parked drafts from active count
    if (isPortalParkedDraft({ status, parkedByEditingRequestId })) {
      return false;
    }
    
    return true;
  }).length;
}

/**
 * Assert no active editable request exists, then create one (ADR-FP-071 create path).
 * Blocks if any active (non-parked) continuable exists.
 */
export async function createWorkingPrintRequestInTransaction(
  transaction: Transaction,
  customer: WorkingPrintRequestCustomer,
  notes?: string,
): Promise<{ printRequestId: string; name: string }> {
  const existing = await transaction.get(continuableQuery(customer.customerId));
  const activeEditableCount = countActiveEditableRequests(existing.docs);
  if (activeEditableCount > 0) {
    throw failedPrecondition(PORTAL_ONE_WORKING_REQUEST_MESSAGE);
  }

  return createPrintRequestDoc(transaction, customer, notes);
}

/**
 * Create a Continuable request for Cap B / capacity leftovers after the source request
 * was set to `active` in the same transaction (one-working-request invariant).
 * Does not re-query Continuable docs — caller must have finalized the source request first.
 */
export async function createRemainderWorkingPrintRequestInTransaction(
  transaction: Transaction,
  customer: WorkingPrintRequestCustomer,
): Promise<{ printRequestId: string; name: string }> {
  return createPrintRequestDoc(transaction, customer);
}

/**
 * Resolve the single active editable working request or create one when none exists.
 * Reuses only active (non-parked) requests; prefers editing over draft.
 * Fails closed if more than one active editable exists or if only parked exists.
 */
export async function resolveOrCreateWorkingPrintRequestInTransaction(
  transaction: Transaction,
  customer: WorkingPrintRequestCustomer,
): Promise<{ printRequestId: string; created: boolean; name?: string }> {
  const existing = await transaction.get(continuableQuery(customer.customerId));
  const portalEditable = filterPortalEditableContinuableDocs(existing.docs);

  // Filter to active (non-parked) requests
  const activeEditable = portalEditable.filter((doc) => {
    const data = doc.data();
    const status = (typeof data.status === "string" ? data.status : "draft") as PrintRequestStatus;
    const parkedByEditingRequestId = typeof data.parkedByEditingRequestId === "string" 
      ? data.parkedByEditingRequestId 
      : undefined;
    
    return !isPortalParkedDraft({ status, parkedByEditingRequestId });
  });

  if (activeEditable.length > 1) {
    throw failedPrecondition(PORTAL_MULTIPLE_WORKING_REQUESTS_MESSAGE);
  }

  if (activeEditable.length === 1) {
    return { printRequestId: activeEditable[0].id, created: false };
  }

  // If only parked drafts exist, fail closed with message requiring restore/cleanup
  if (portalEditable.length > 0) {
    throw failedPrecondition("Cannot create new request while parked requests exist. Please restore or clean up existing requests first.");
  }

  // Legacy Studio drafts may still exist; Portal may create its own working request.
  const created = await createPrintRequestDoc(transaction, customer);
  return { printRequestId: created.printRequestId, created: true, name: created.name };
}

async function createPrintRequestDoc(
  transaction: Transaction,
  customer: WorkingPrintRequestCustomer,
  notes?: string,
): Promise<{ printRequestId: string; name: string }> {
  const username = requireValidCustomerUsername(customer.username);
  const customerRef = adminDb.collection("customers").doc(customer.customerId);
  const requestRef = adminDb.collection("printRequests").doc();
  const timestamp = FieldValue.serverTimestamp();

  const customerSnapshot = await transaction.get(customerRef);
  if (!customerSnapshot.exists) {
    throw invalidArgument("Customer profile not found.");
  }

  const customerData = customerSnapshot.data()!;
  const nextSequence = resolveNextSequence(customerData.nextPrintRequestSequence);
  const nextTotal =
    typeof customerData.totalPrintRequests === "number" && customerData.totalPrintRequests >= 0
      ? customerData.totalPrintRequests
      : 0;
  const name = formatCustomerPrintRequestName(username, nextSequence);

  transaction.set(requestRef, {
    name,
    customerId: customer.customerId,
    isInternal: false,
    requestOrigin: "portal_customer",
    status: "draft",
    itemCount: 0,
    queueTab: "working",
    requestSequenceNumber: nextSequence,
    customerUsernameSnapshot: username,
    customerDisplayNameSnapshot: customer.displayName,
    nameFormatVersion: "cr-ir-v1",
    ...(notes ? { notes } : {}),
    createdBy: customer.userId,
    updatedBy: customer.userId,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  transaction.update(customerRef, {
    nextPrintRequestSequence: nextSequence + 1,
    totalPrintRequests: nextTotal + 1,
    updatedAt: timestamp,
  });

  return { printRequestId: requestRef.id, name };
}
