import { FieldValue, type DocumentData, type Query, type Transaction } from "firebase-admin/firestore";

import {
  formatCustomerPrintRequestName,
  formatInternalPrintRequestName,
  requireValidInternalBaseName,
} from "../../../packages/shared/src/utils/printRequestNaming";
import { requireValidCustomerUsername } from "../../../packages/shared/src/utils/customerUsername";
import type {
  CopyStudioPrintRequestRequest,
  CopyStudioPrintRequestResponse,
} from "../../../packages/shared/src/types/printRequest/copyStudioPrintRequest.types";

import { adminDb } from "./admin";
import { failedPrecondition, invalidArgument } from "./errors";

const INTERNAL_PRINT_REQUEST_COUNTER_ID = "printRequests";
const MAX_COPY_ITEMS = 100;

interface RawItem extends DocumentData {
  sourceType?: unknown;
  designId?: unknown;
  customerUploadId?: unknown;
  staffArtworkId?: unknown;
  titleSnapshot?: unknown;
  quantity?: unknown;
  printWidthInches?: unknown;
  printHeightInches?: unknown;
  sizeLabel?: unknown;
  standardSizePresetKey?: unknown;
  sortOrder?: unknown;
  notes?: unknown;
  artworkEnhanceMode?: unknown;
  preEnhancePrintWidthInches?: unknown;
  preEnhancePrintHeightInches?: unknown;
}

interface RawRequest extends DocumentData {
  customerId?: unknown;
  isInternal?: unknown;
  customerUsernameSnapshot?: unknown;
}

function resolveNextSequence(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 ? value : 1;
}

function readNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readPositiveInteger(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw failedPrecondition(`Source item is missing a valid ${field}.`);
  }
  return value;
}

function readPositiveNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw failedPrecondition(`Source item is missing a valid ${field}.`);
  }
  return value;
}

function readItemIdentity(item: RawItem, index: number):
  | { sourceType: "catalog_design"; designId: string }
  | { sourceType: "customer_upload"; customerUploadId: string }
  | { sourceType: "staff_artwork"; staffArtworkId: string } {
  if (
    item.sourceType !== undefined &&
    item.sourceType !== "catalog_design" &&
    item.sourceType !== "customer_upload" &&
    item.sourceType !== "staff_artwork"
  ) {
    throw failedPrecondition(`Source item ${index + 1} has an invalid source type.`);
  }
  if (item.sourceType === "catalog_design" && item.customerUploadId) {
    throw failedPrecondition(`Source item ${index + 1} has conflicting source identity fields.`);
  }
  if (item.sourceType === "customer_upload" && item.designId) {
    throw failedPrecondition(`Source item ${index + 1} has conflicting source identity fields.`);
  }
  if (item.sourceType === "staff_artwork" && (item.designId || item.customerUploadId)) {
    throw failedPrecondition(`Source item ${index + 1} has conflicting source identity fields.`);
  }
  const sourceType = item.sourceType ?? (item.customerUploadId ? "customer_upload" : item.staffArtworkId ? "staff_artwork" : "catalog_design");

  if (sourceType === "customer_upload") {
    const customerUploadId = readNonEmptyString(item.customerUploadId);
    if (!customerUploadId || readNonEmptyString(item.designId)) {
      throw failedPrecondition(`Source item ${index + 1} has an invalid customer-upload identity.`);
    }
    return { sourceType, customerUploadId };
  }

  if (sourceType === "staff_artwork") {
    const staffArtworkId = readNonEmptyString(item.staffArtworkId);
    if (!staffArtworkId || readNonEmptyString(item.designId) || readNonEmptyString(item.customerUploadId)) {
      throw failedPrecondition(`Source item ${index + 1} has an invalid Staff Artwork identity.`);
    }
    return { sourceType, staffArtworkId };
  }

  const designId = readNonEmptyString(item.designId);
  if (!designId || readNonEmptyString(item.customerUploadId)) {
    throw failedPrecondition(`Source item ${index + 1} has an invalid catalog-design identity.`);
  }
  return { sourceType, designId };
}

function buildItemPayload(
  callerId: string,
  printRequestId: string,
  itemRefId: string,
  item: RawItem,
  identity: ReturnType<typeof readItemIdentity>,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    id: itemRefId,
    printRequestId,
    sourceType: identity.sourceType,
    quantity: readPositiveInteger(item.quantity, "quantity"),
    printWidthInches: readPositiveNumber(item.printWidthInches, "print width"),
    printHeightInches: readPositiveNumber(item.printHeightInches, "print height"),
    status: "pending",
    addedBy: callerId,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (identity.sourceType === "customer_upload") {
    payload.customerUploadId = identity.customerUploadId;
    const titleSnapshot = readNonEmptyString(item.titleSnapshot);
    if (titleSnapshot) payload.titleSnapshot = titleSnapshot;
  } else if (identity.sourceType === "staff_artwork") {
    payload.staffArtworkId = identity.staffArtworkId;
    const titleSnapshot = readNonEmptyString(item.titleSnapshot);
    if (titleSnapshot) payload.titleSnapshot = titleSnapshot;
  } else {
    payload.designId = identity.designId;
  }

  const optionalStringFields = ["sizeLabel", "standardSizePresetKey", "notes"] as const;
  for (const field of optionalStringFields) {
    const value = readNonEmptyString(item[field]);
    if (value) payload[field] = value;
  }

  if (typeof item.sortOrder === "number" && Number.isFinite(item.sortOrder)) {
    payload.sortOrder = item.sortOrder;
  }

  if (item.artworkEnhanceMode === "baseline" || item.artworkEnhanceMode === "enhanced") {
    payload.artworkEnhanceMode = item.artworkEnhanceMode;
  }

  for (const field of ["preEnhancePrintWidthInches", "preEnhancePrintHeightInches"] as const) {
    if (typeof item[field] === "number" && Number.isFinite(item[field]) && item[field] > 0) {
      payload[field] = item[field];
    }
  }

  return payload;
}

function buildContinuableQuery(customerId: string): Query<DocumentData> {
  return adminDb
    .collection("printRequests")
    .where("customerId", "==", customerId)
    .where("isInternal", "==", false)
    .where("status", "in", ["draft", "editing"])
    .limit(1);
}

function assertActiveCustomer(data: DocumentData, customerId: string): string {
  if (data.isGuest === true || data.isDeleted === true || data.isDisabled === true || data.isMerged === true) {
    throw invalidArgument("Choose an active, non-guest customer.");
  }

  const username = readNonEmptyString(data.username);
  if (!username) {
    throw invalidArgument("The selected customer needs a username before receiving a print request.");
  }

  try {
    return requireValidCustomerUsername(username);
  } catch {
    throw invalidArgument(`Customer ${customerId} has an invalid username.`);
  }
}

export async function copyStudioPrintRequestInTransaction(
  transaction: Transaction,
  callerId: string,
  input: CopyStudioPrintRequestRequest,
): Promise<CopyStudioPrintRequestResponse> {
  const sourceId = input.sourcePrintRequestId.trim();
  if (!sourceId) throw invalidArgument("A source print request ID is required.");
  if (input.destinationKind !== "customer" && input.destinationKind !== "internal") {
    throw invalidArgument("Choose a Customer Request or Internal Request destination.");
  }

  const sourceRef = adminDb.collection("printRequests").doc(sourceId);
  const itemQuery = adminDb.collection("printRequestItems").where("printRequestId", "==", sourceId);
  const sourceSnapshot = await transaction.get(sourceRef);
  const itemSnapshot = await transaction.get(itemQuery);

  if (!sourceSnapshot.exists) throw invalidArgument("Source print request not found.");
  if (itemSnapshot.empty) throw failedPrecondition("This print request has no items to copy.");
  if (itemSnapshot.size > MAX_COPY_ITEMS) {
    throw failedPrecondition(`This print request has too many items to copy at once (maximum ${MAX_COPY_ITEMS}).`);
  }

  const source = sourceSnapshot.data() as RawRequest;
  if (source.isInternal !== true && source.isInternal !== false) {
    throw failedPrecondition("Source print request has an invalid request type.");
  }
  const identities = itemSnapshot.docs.map((itemDoc, index) =>
    readItemIdentity(itemDoc.data() as RawItem, index),
  );

  const destinationCustomerId = input.destinationKind === "customer"
    ? (input.destinationCustomerId?.trim() || (!source.isInternal ? readNonEmptyString(source.customerId) : ""))
    : undefined;

  const destinationCustomerRef = destinationCustomerId
    ? adminDb.collection("customers").doc(destinationCustomerId)
    : null;
  const destinationCustomerSnapshot = destinationCustomerRef
    ? await transaction.get(destinationCustomerRef)
    : null;

  let destinationUsername: string | undefined;
  let destinationDisplayName: string | undefined;
  if (input.destinationKind === "customer") {
    if (!destinationCustomerId || !destinationCustomerSnapshot?.exists) {
      throw invalidArgument("The destination customer was not found.");
    }
    destinationUsername = assertActiveCustomer(destinationCustomerSnapshot.data() ?? {}, destinationCustomerId);
    destinationDisplayName = readNonEmptyString(destinationCustomerSnapshot.data()?.displayName);
    const continuableSnapshot = await transaction.get(buildContinuableQuery(destinationCustomerId));
    if (!continuableSnapshot.empty) {
      throw failedPrecondition(
        "This customer already has an open print request. Finish or release that request before copying.",
      );
    }
  }

  const counterRef = input.destinationKind === "internal"
    ? adminDb.collection("counters").doc(INTERNAL_PRINT_REQUEST_COUNTER_ID)
    : null;
  const counterSnapshot = counterRef ? await transaction.get(counterRef) : null;
  const sequence = input.destinationKind === "internal"
    ? resolveNextSequence(counterSnapshot?.data()?.nextInternalRequestSequence)
    : resolveNextSequence(destinationCustomerSnapshot?.data()?.nextPrintRequestSequence);

  const internalBaseName = input.destinationKind === "internal"
    ? requireValidInternalBaseName(
        input.destinationInternalBaseName?.trim() ||
          (source.isInternal === true ? readNonEmptyString(source.internalBaseName) : undefined) ||
          (!source.isInternal ? readNonEmptyString(source.customerUsernameSnapshot) : undefined) ||
          "internal",
      )
    : undefined;

  const sourceUploadIds = identities.flatMap((identity) =>
    identity.sourceType === "customer_upload" ? [identity.customerUploadId] : [],
  );
  const sourceDesignIds = identities.flatMap((identity) =>
    identity.sourceType === "catalog_design" ? [identity.designId] : [],
  );
  const sourceStaffArtworkIds = identities.flatMap((identity) =>
    identity.sourceType === "staff_artwork" ? [identity.staffArtworkId] : [],
  );

  const [uploadSnapshots, designSnapshots, staffArtworkSnapshots] = await Promise.all([
    Promise.all(sourceUploadIds.map((id) => transaction.get(adminDb.collection("customerUploads").doc(id)))),
    Promise.all(sourceDesignIds.map((id) => transaction.get(adminDb.collection("designs").doc(id)))),
    Promise.all(sourceStaffArtworkIds.map((id) => transaction.get(adminDb.collection("staffArtworks").doc(id)))),
  ]);

  for (let index = 0; index < identities.length; index += 1) {
    const identity = identities[index];
    if (identity.sourceType === "customer_upload") {
      const uploadSnapshot = uploadSnapshots[sourceUploadIds.indexOf(identity.customerUploadId)];
      if (!uploadSnapshot?.exists) {
        throw failedPrecondition(`Customer upload ${identity.customerUploadId} is no longer available.`);
      }
      const upload = uploadSnapshot.data() ?? {};
      const ownerCustomerId = readNonEmptyString(upload.customerId);
      if (!ownerCustomerId) {
        throw failedPrecondition(`Customer upload ${identity.customerUploadId} has no owner.`);
      }
      if (input.destinationKind === "customer" && ownerCustomerId !== destinationCustomerId) {
        throw failedPrecondition(
          `Customer upload ${identity.customerUploadId} is private to another customer; the copy was rejected atomically.`,
        );
      }
    } else if (identity.sourceType === "staff_artwork") {
      const artworkSnapshot = staffArtworkSnapshots[sourceStaffArtworkIds.indexOf(identity.staffArtworkId)];
      if (!artworkSnapshot?.exists || !["ready", "archived"].includes(String(artworkSnapshot.data()?.status))) {
        throw failedPrecondition(`Staff Artwork ${identity.staffArtworkId} is no longer available.`);
      }
    } else {
      const designSnapshot = designSnapshots[sourceDesignIds.indexOf(identity.designId)];
      if (!designSnapshot?.exists) {
        throw failedPrecondition(`Catalog design ${identity.designId} is no longer available.`);
      }
    }
  }

  const requestRef = adminDb.collection("printRequests").doc();
  const requestName = input.destinationKind === "internal"
    ? formatInternalPrintRequestName(internalBaseName!, sequence)
    : formatCustomerPrintRequestName(destinationUsername!, sequence);
  const timestamp = FieldValue.serverTimestamp();

  transaction.set(requestRef, {
    name: requestName,
    ...(destinationCustomerId ? { customerId: destinationCustomerId } : {}),
    isInternal: input.destinationKind === "internal",
    requestOrigin: input.destinationKind === "internal" ? "studio_internal" : "studio_customer",
    status: "draft",
    itemCount: itemSnapshot.size,
    queueTab: "working",
    requestSequenceNumber: sequence,
    ...(destinationUsername ? { customerUsernameSnapshot: destinationUsername } : {}),
    ...(destinationDisplayName ? { customerDisplayNameSnapshot: destinationDisplayName } : {}),
    ...(internalBaseName ? { internalBaseName } : {}),
    nameFormatVersion: "cr-ir-v1",
    createdBy: callerId,
    updatedBy: callerId,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  if (counterRef && counterSnapshot) {
    transaction.set(counterRef, {
      nextInternalRequestSequence: sequence + 1,
      ...(counterSnapshot.exists ? {} : { createdAt: timestamp }),
      updatedAt: timestamp,
    }, { merge: true });
  } else if (destinationCustomerRef && destinationCustomerSnapshot) {
    const customer = destinationCustomerSnapshot.data() ?? {};
    transaction.update(destinationCustomerRef, {
      nextPrintRequestSequence: sequence + 1,
      totalPrintRequests: (typeof customer.totalPrintRequests === "number" ? customer.totalPrintRequests : 0) + 1,
      updatedAt: timestamp,
    });
  }

  for (let index = 0; index < itemSnapshot.docs.length; index += 1) {
    const sourceItemDoc = itemSnapshot.docs[index];
    const itemRef = adminDb.collection("printRequestItems").doc();
    transaction.set(
      itemRef,
      buildItemPayload(callerId, requestRef.id, itemRef.id, sourceItemDoc.data() as RawItem, identities[index]),
    );
  }

  return {
    printRequestId: requestRef.id,
    printRequestName: requestName,
    isInternal: input.destinationKind === "internal",
    ...(destinationCustomerId ? { customerId: destinationCustomerId } : {}),
    copiedItemCount: itemSnapshot.size,
  };
}
