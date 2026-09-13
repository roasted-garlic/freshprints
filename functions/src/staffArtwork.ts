import { FieldValue, type DocumentReference } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";

import {
  STAFF_ARTWORK_STORAGE_ROOT,
  getStaffArtworkPreviewStoragePath,
  getStaffArtworkProductionStoragePath,
  getStaffArtworkSourceStoragePath,
  getStaffArtworkThumbnailStoragePath,
  isCanonicalStaffArtworkStoragePath,
  STAFF_ARTWORK_OWNED_STORAGE_PATH_FIELDS,
} from "../../packages/shared/src/constants/staffArtwork/staffArtworkStoragePaths";
import { CUSTOMER_UPLOAD_MAX_SINGLE_IMAGE_BYTES } from "../../packages/shared/src/constants/customerUpload/customerUploadLimits.constants";
import {
  ARTWORK_BACKGROUND_PRESET_LIGHT_BLACK,
  isDefaultArtworkBackgroundHex,
  normalizeArtworkBackgroundHex,
} from "../../packages/shared/src/constants/design/artworkBackground.constants";
import { getOriginalStoragePath, getPreviewStoragePath, getThumbnailStoragePath } from "../../packages/shared/src/constants/design/designStoragePaths";

import {
  describeStaffArtworkDeletionBlockers,
  resolveStaffArtworkDeletionBlockers,
} from "../../packages/shared/src/utils/staffArtworkDeletionEligibility";
import { adminDb, adminStorage } from "./lib/admin";
import { assertStaffCaller, loadCallerProfile } from "./lib/caller";
import { processCustomerUploadImageBytes, saveCustomerUploadProcessedOutputs } from "./lib/customerUploadProcessing";
import { storageObjectPath } from "./lib/storageObjectPath";
import { failedPrecondition, invalidArgument, notFound, permissionDenied, unauthenticated } from "./lib/errors";
import { withoutUndefinedFields } from "./lib/firestoreDocument";

const COLLECTION = "staffArtworks";
const MAX_TITLE_LENGTH = 160;
const MAX_DESCRIPTION_LENGTH = 2_000;

function generateDefaultStaffArtworkTitle(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 10);
}

/** Staff Artwork preview mats: grey (default/omitted) or dark only. */
function resolveStaffArtworkBackgroundWriteValue(raw: unknown): string | null {
  const normalized = normalizeArtworkBackgroundHex(raw);
  if (!normalized || isDefaultArtworkBackgroundHex(normalized)) {
    return null;
  }
  if (normalized === ARTWORK_BACKGROUND_PRESET_LIGHT_BLACK) {
    return ARTWORK_BACKGROUND_PRESET_LIGHT_BLACK;
  }
  throw invalidArgument("Staff Artwork background must be grey or dark.");
}

function requireOwnerAdmin(role: string): void {
  if (role !== "owner" && role !== "admin") throw permissionDenied("Only owners and admins may manage Staff Artwork.");
}

function text(value: unknown, label: string, maxLength: number, required = false): string | undefined {
  if (value === undefined || value === null) {
    if (required) throw invalidArgument(`${label} is required.`);
    return undefined;
  }
  if (typeof value !== "string") throw invalidArgument(`${label} must be text.`);
  const result = value.trim();
  if (required && !result) throw invalidArgument(`${label} is required.`);
  if (result.length > maxLength) throw invalidArgument(`${label} is too long.`);
  return result || undefined;
}

function stringId(value: unknown, label: string): string {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]+$/.test(value.trim())) {
    throw invalidArgument(`${label} is invalid.`);
  }
  return value.trim();
}

function staffArtworkRef(id: string): DocumentReference {
  return adminDb.collection(COLLECTION).doc(id);
}

export interface CreateStaffArtworkUploadResponse {
  staffArtworkId: string;
  sourceStoragePath: string;
  reusedExisting: boolean;
}

export const createStaffArtworkUpload = onCall(async (request): Promise<CreateStaffArtworkUploadResponse> => {
  if (!request.auth?.uid) throw unauthenticated();
  const caller = await loadCallerProfile(request.auth.uid);
  assertStaffCaller(caller);
  requireOwnerAdmin(caller.role);
  const data = request.data && typeof request.data === "object" ? request.data as Record<string, unknown> : {};
  const existingId = data.staffArtworkId ? stringId(data.staffArtworkId, "staffArtworkId") : undefined;
  if (existingId) {
    const existing = await staffArtworkRef(existingId).get();
    if (existing.exists && existing.data()?.createdBy === caller.id && existing.data()?.status === "processing") {
      return { staffArtworkId: existingId, sourceStoragePath: getStaffArtworkSourceStoragePath(existingId), reusedExisting: true };
    }
  }
  const title = text(data.title, "Title", MAX_TITLE_LENGTH) ?? generateDefaultStaffArtworkTitle();
  const description = text(data.description, "Description", MAX_DESCRIPTION_LENGTH);
  const sourceFileName = text(data.sourceFileName, "sourceFileName", 240) ?? "artwork";
  const contentType = text(data.contentType, "contentType", 100) ?? "image/png";
  if (contentType.toLowerCase() !== "image/png") {
    throw invalidArgument("Only PNG uploads are supported for Staff Artwork.");
  }
  let customerId: string | null = null;
  const rawCustomerId = data.customerId;
  if (rawCustomerId !== null && rawCustomerId !== undefined && rawCustomerId !== "") {
    customerId = stringId(rawCustomerId, "customerId");
    const customerSnap = await adminDb.collection("customers").doc(customerId).get();
    if (!customerSnap.exists) throw invalidArgument("Customer was not found.");
    const customer = customerSnap.data() ?? {};
    if (customer.isMerged === true || customer.mergedIntoCustomerId) {
      throw failedPrecondition("New Staff Artwork associations must target the surviving customer.");
    }
  }
  const customerSnap = customerId ? await adminDb.collection("customers").doc(customerId).get() : null;
  const customer = customerSnap?.data() ?? {};
  const artworkBackgroundChoice =
    data.artworkBackgroundChoice === "auto" ||
    data.artworkBackgroundChoice === "light" ||
    data.artworkBackgroundChoice === "dark"
      ? data.artworkBackgroundChoice
      : null;
  const artworkBackgroundAuto = artworkBackgroundChoice === "auto";
  const artworkBackgroundHex = artworkBackgroundAuto
    ? null
    : resolveStaffArtworkBackgroundWriteValue(
        artworkBackgroundChoice === "dark"
          ? ARTWORK_BACKGROUND_PRESET_LIGHT_BLACK
          : artworkBackgroundChoice === "light"
            ? null
            : data.artworkBackgroundHex,
      );
  const ref = staffArtworkRef(existingId ?? adminDb.collection(COLLECTION).doc().id);
  const id = ref.id;
  const sourceStoragePath = getStaffArtworkSourceStoragePath(id);
  await ref.set(withoutUndefinedFields({
    id,
    title,
    description,
    sourceFileName,
    contentType,
    status: "processing",
    sourceStoragePath,
    productionStoragePath: null,
    interactiveEnhancedProductionStoragePath: null,
    previewStoragePath: null,
    thumbnailStoragePath: null,
    customerId,
    customerDisplayNameSnapshot: customerId ? String(customer.displayName ?? "") : null,
    customerUsernameSnapshot: customerId ? String(customer.username ?? "") : null,
    artworkBackgroundHex,
    artworkBackgroundAuto,
    promotedDesignId: null,
    promotionStatus: "not_promoted",
    createdAt: FieldValue.serverTimestamp(),
    createdBy: caller.id,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: caller.id,
  }));
  return { staffArtworkId: id, sourceStoragePath, reusedExisting: false };
});

export interface FinalizeStaffArtworkResponse {
  staffArtworkId: string;
  status: "ready" | "failed";
  alreadyReady: boolean;
  productionStoragePath?: string;
  previewStoragePath?: string;
  thumbnailStoragePath?: string;
  errorCode?: string;
  errorMessage?: string;
}

export const finalizeStaffArtwork = onCall(
  { timeoutSeconds: 540, memory: "4GiB" },
  async (request): Promise<FinalizeStaffArtworkResponse> => {
    if (!request.auth?.uid) throw unauthenticated();
    const caller = await loadCallerProfile(request.auth.uid);
    assertStaffCaller(caller);
    requireOwnerAdmin(caller.role);
    const data = request.data && typeof request.data === "object" ? request.data as Record<string, unknown> : {};
    const id = stringId(data.staffArtworkId, "staffArtworkId");
    const ref = staffArtworkRef(id);
    const snap = await ref.get();
    if (!snap.exists) throw notFound("Staff Artwork was not found.");
    const artwork = snap.data() ?? {};
    if (artwork.status === "ready") {
      return { staffArtworkId: id, status: "ready", alreadyReady: true, productionStoragePath: String(artwork.productionStoragePath ?? ""), previewStoragePath: String(artwork.previewStoragePath ?? ""), thumbnailStoragePath: String(artwork.thumbnailStoragePath ?? "") };
    }
    const expectedSourcePath = getStaffArtworkSourceStoragePath(id);
    if (artwork.sourceStoragePath !== expectedSourcePath) throw failedPrecondition("Staff Artwork source path is invalid.");
    const bucket = adminStorage.bucket();
    const sourceFile = bucket.file(storageObjectPath(expectedSourcePath));
    const [exists] = await sourceFile.exists();
    if (!exists) throw failedPrecondition("Source artwork was not found. Upload the image and try again.");
    const [sourceMetadata] = await sourceFile.getMetadata();
    const metadataSize = Number(sourceMetadata.size ?? 0);
    const metadataContentType = String(sourceMetadata.contentType ?? "").toLowerCase();
    if (
      !Number.isFinite(metadataSize) ||
      metadataSize <= 0 ||
      metadataSize > CUSTOMER_UPLOAD_MAX_SINGLE_IMAGE_BYTES ||
      metadataContentType !== "image/png"
    ) {
      throw failedPrecondition("Source artwork metadata is invalid. Upload a PNG image and try again.");
    }
    const [sourceBytes] = await sourceFile.download();
    if (sourceBytes.byteLength !== metadataSize) {
      throw failedPrecondition("Source artwork changed while it was being finalized. Upload it again and retry.");
    }
    if (sourceBytes.byteLength <= 0 || sourceBytes.byteLength > CUSTOMER_UPLOAD_MAX_SINGLE_IMAGE_BYTES) {
      throw invalidArgument("Artwork exceeds the supported image size.");
    }
    await ref.update({ status: "processing", processingStartedAt: FieldValue.serverTimestamp(), processingErrorCode: null, processingErrorMessage: null, updatedAt: FieldValue.serverTimestamp(), updatedBy: caller.id });
    const processed = await processCustomerUploadImageBytes(sourceBytes, {
      skipCustomerQualityGates: true,
      onStage: async (stage) => {
        await ref.update({ processingStage: stage, updatedAt: FieldValue.serverTimestamp(), updatedBy: caller.id });
      },
    });
    if (!processed.ok) {
      await ref.update({ status: "failed", processingErrorCode: processed.code, processingErrorMessage: processed.message, processingStage: null, updatedAt: FieldValue.serverTimestamp(), updatedBy: caller.id });
      return { staffArtworkId: id, status: "failed", alreadyReady: false, errorCode: processed.code, errorMessage: processed.message };
    }
    const productionStoragePath = getStaffArtworkProductionStoragePath(id);
    const previewStoragePath = getStaffArtworkPreviewStoragePath(id);
    const thumbnailStoragePath = getStaffArtworkThumbnailStoragePath(id);
    await saveCustomerUploadProcessedOutputs({
      bucket,
      sourceObjectPath: storageObjectPath(expectedSourcePath),
      productionObjectPath: storageObjectPath(productionStoragePath),
      previewObjectPath: storageObjectPath(previewStoragePath),
      thumbnailObjectPath: storageObjectPath(thumbnailStoragePath),
      processed,
    });
    const autoBackground =
      artwork.artworkBackgroundAuto === true
        ? processed.suggestDarkArtworkBackground === true
          ? ARTWORK_BACKGROUND_PRESET_LIGHT_BLACK
          : null
        : undefined;
    await ref.update(withoutUndefinedFields({
      status: "ready",
      processingStage: null,
      productionStoragePath,
      previewStoragePath,
      thumbnailStoragePath,
      ...(autoBackground !== undefined
        ? {
            artworkBackgroundHex: autoBackground,
            artworkBackgroundAuto: false,
          }
        : {}),
      processing: {
        sourceFormat: processed.sourceFormat,
        sourceWidthPx: processed.sourceWidthPx,
        sourceHeightPx: processed.sourceHeightPx,
        widthPx: processed.widthPx,
        heightPx: processed.heightPx,
        printWidthInches: processed.printWidthInches,
        printHeightInches: processed.printHeightInches,
        effectiveDpi: processed.effectiveDpi,
        approvedMaxPrintWidthInches: processed.approvedMaxPrintWidthInches,
        approvedMaxPrintHeightInches: processed.approvedMaxPrintHeightInches,
        sizingPolicyVersion: processed.sizingPolicyVersion,
        wasTrimmed: processed.wasTrimmed,
        wasUpscaled: processed.wasUpscaled,
        wasNormalizedForDimensions: processed.wasNormalizedForDimensions,
        upscaleFactor: processed.upscaleFactor,
        upscalePassCount: processed.upscalePassCount,
        transparencyPassed: processed.transparencyPassed,
        suggestDarkArtworkBackground: processed.suggestDarkArtworkBackground,
        productionReusedSource: processed.productionReusedSource,
        processingWarning: processed.sizingWarningCode ?? null,
      },
      processingCompletedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: caller.id,
    }));
    return { staffArtworkId: id, status: "ready", alreadyReady: false, productionStoragePath, previewStoragePath, thumbnailStoragePath };
  },
);

export const updateStaffArtwork = onCall(async (request) => {
  if (!request.auth?.uid) throw unauthenticated();
  const caller = await loadCallerProfile(request.auth.uid);
  assertStaffCaller(caller);
  requireOwnerAdmin(caller.role);
  const data = request.data && typeof request.data === "object" ? request.data as Record<string, unknown> : {};
  const id = stringId(data.staffArtworkId, "staffArtworkId");
  const title = text(data.title, "Title", MAX_TITLE_LENGTH, true)!;
  const description = text(data.description, "Description", MAX_DESCRIPTION_LENGTH);
  let customerId: string | null = null;
  const rawCustomerId = data.customerId;
  if (rawCustomerId !== null && rawCustomerId !== undefined && rawCustomerId !== "") {
    customerId = stringId(rawCustomerId, "customerId");
    const customerSnap = await adminDb.collection("customers").doc(customerId).get();
    if (!customerSnap.exists) throw invalidArgument("Customer was not found.");
    const customer = customerSnap.data() ?? {};
    if (customer.isMerged === true || customer.mergedIntoCustomerId) {
      throw failedPrecondition("New Staff Artwork associations must target the surviving customer.");
    }
  }
  const customerSnap = customerId ? await adminDb.collection("customers").doc(customerId).get() : null;
  const customer = customerSnap?.data() ?? {};
  const artworkBackgroundHex = resolveStaffArtworkBackgroundWriteValue(data.artworkBackgroundHex);
  const ref = staffArtworkRef(id);
  const existing = await ref.get();
  if (!existing.exists) throw notFound("Staff Artwork was not found.");
  await ref.update(withoutUndefinedFields({
    title,
    description: description ?? null,
    customerId,
    customerDisplayNameSnapshot: customerId ? String(customer.displayName ?? "") : null,
    customerUsernameSnapshot: customerId ? String(customer.username ?? "") : null,
    artworkBackgroundHex,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: caller.id,
  }));
  return { staffArtworkId: id };
});

export const setStaffArtworkArchiveState = onCall(async (request) => {
  if (!request.auth?.uid) throw unauthenticated();
  const caller = await loadCallerProfile(request.auth.uid);
  assertStaffCaller(caller);
  requireOwnerAdmin(caller.role);
  const data = request.data && typeof request.data === "object" ? request.data as Record<string, unknown> : {};
  const id = stringId(data.staffArtworkId, "staffArtworkId");
  if (typeof data.archived !== "boolean") throw invalidArgument("archived must be boolean.");
  const ref = staffArtworkRef(id);
  const snap = await ref.get();
  if (!snap.exists) throw notFound("Staff Artwork was not found.");
  await ref.update(withoutUndefinedFields(data.archived
    ? { status: "archived", archivedAt: FieldValue.serverTimestamp(), archivedBy: caller.id, updatedAt: FieldValue.serverTimestamp(), updatedBy: caller.id }
    : { status: "ready", archivedAt: FieldValue.delete(), archivedBy: FieldValue.delete(), updatedAt: FieldValue.serverTimestamp(), updatedBy: caller.id }));
  return { staffArtworkId: id, status: data.archived ? "archived" : "ready" };
});

export const deleteEligibleStaffArtwork = onCall(async (request) => {
  if (!request.auth?.uid) throw unauthenticated();
  const caller = await loadCallerProfile(request.auth.uid);
  assertStaffCaller(caller);
  requireOwnerAdmin(caller.role);
  const data = request.data && typeof request.data === "object" ? request.data as Record<string, unknown> : {};
  const id = stringId(data.staffArtworkId, "staffArtworkId");
  const ref = staffArtworkRef(id);
  const snap = await ref.get();
  if (!snap.exists) throw notFound("Staff Artwork was not found.");
  const artwork = snap.data() ?? {};

  const blockers = await collectStaffArtworkDeletionBlockers(id, artwork);
  const preview = { staffArtworkId: id, canDelete: blockers.length === 0, blockers };
  if (data.confirm !== true) return preview;
  if (blockers.length > 0) {
    throw failedPrecondition(
      `Staff Artwork cannot be deleted: ${describeStaffArtworkDeletionBlockers(blockers)}.`,
    );
  }
  await deleteStaffArtworkStorageAndDoc(id, artwork);
  return { ...preview, deleted: true };
});

async function collectStaffArtworkDeletionBlockers(
  id: string,
  artwork: Record<string, unknown>,
): Promise<string[]> {
  async function queryByStaffArtworkId(collectionName: string) {
    try {
      return await adminDb.collection(collectionName).where("staffArtworkId", "==", id).get();
    } catch (error) {
      console.error("Staff Artwork deletion reference check failed.", {
        staffArtworkId: id,
        collectionName,
        error,
      });
      throw failedPrecondition(
        `Unable to verify deletion safety for ${collectionName}. Please try again.`,
      );
    }
  }

  const [itemsSnap, allocationsSnap, gangItemsSnap] = await Promise.all([
    queryByStaffArtworkId("printRequestItems"),
    queryByStaffArtworkId("showAllocations"),
    queryByStaffArtworkId("gangSheetItems"),
  ]);

  const allocations = allocationsSnap.docs.map((doc) => {
    const data = doc.data() ?? {};
    return {
      printRequestItemId:
        typeof data.printRequestItemId === "string" ? data.printRequestItemId : null,
      upcomingShowId: typeof data.upcomingShowId === "string" ? data.upcomingShowId : null,
      status: typeof data.status === "string" ? data.status : null,
    };
  });
  const gangSheetItems = gangItemsSnap.docs.map((doc) => {
    const data = doc.data() ?? {};
    return {
      upcomingShowId: typeof data.upcomingShowId === "string" ? data.upcomingShowId : null,
    };
  });

  const showIds = new Set<string>();
  for (const allocation of allocations) {
    if (allocation.upcomingShowId) showIds.add(allocation.upcomingShowId);
  }
  for (const gangItem of gangSheetItems) {
    if (gangItem.upcomingShowId) showIds.add(gangItem.upcomingShowId);
  }

  const showProductionStatusById: Record<string, unknown> = {};
  await Promise.all(
    [...showIds].map(async (showId) => {
      try {
        const showSnap = await adminDb.collection("upcomingShows").doc(showId).get();
        showProductionStatusById[showId] = showSnap.exists
          ? showSnap.data()?.productionStatus
          : undefined;
      } catch (error) {
        console.error("Staff Artwork deletion show lookup failed.", {
          staffArtworkId: id,
          upcomingShowId: showId,
          error,
        });
        throw failedPrecondition(
          "Unable to verify whether linked shows or internal sheets are completed. Please try again.",
        );
      }
    }),
  );

  const paths = STAFF_ARTWORK_OWNED_STORAGE_PATH_FIELDS
    .map((field) => artwork[field])
    .filter((path): path is string => typeof path === "string" && path.trim().length > 0);
  const hasUnexpectedStoragePath = paths.some(
    (path) => !isCanonicalStaffArtworkStoragePath(path, id),
  );

  return resolveStaffArtworkDeletionBlockers({
    printRequestItems: itemsSnap.docs.map((doc) => ({ id: doc.id })),
    allocations,
    gangSheetItems,
    showProductionStatusById,
    hasUnexpectedStoragePath,
  });
}

async function deleteStaffArtworkStorageAndDoc(
  id: string,
  artwork: Record<string, unknown>,
): Promise<void> {
  const ref = staffArtworkRef(id);
  const paths = STAFF_ARTWORK_OWNED_STORAGE_PATH_FIELDS
    .map((field) => artwork[field])
    .filter((path): path is string => typeof path === "string" && path.trim().length > 0);
  const bucket = adminStorage.bucket();
  for (const path of paths) {
    try {
      await bucket.file(storageObjectPath(path)).delete({ ignoreNotFound: true });
    } catch (error) {
      console.error("Failed to delete Staff Artwork Storage object.", { path, error });
      throw failedPrecondition(`Unable to delete storage object at ${path}.`);
    }
  }
  await ref.delete();
}

export const promoteStaffArtworkToAiReview = onCall(
  { timeoutSeconds: 120, memory: "1GiB" },
  async (request) => {
  if (!request.auth?.uid) throw unauthenticated();
  const caller = await loadCallerProfile(request.auth.uid);
  assertStaffCaller(caller);
  requireOwnerAdmin(caller.role);
  const data = request.data && typeof request.data === "object" ? request.data as Record<string, unknown> : {};
  const id = stringId(data.staffArtworkId, "staffArtworkId");
  const ref = staffArtworkRef(id);
  const preSnap = await ref.get();
  if (!preSnap.exists) throw notFound("Staff Artwork was not found.");
  const preArtwork = preSnap.data() ?? {};
  const blockers = await collectStaffArtworkDeletionBlockers(id, preArtwork);
  if (blockers.length > 0) {
    throw failedPrecondition(
      `Cannot send to AI Review while this artwork is still used (${describeStaffArtworkDeletionBlockers(blockers)}).`,
    );
  }

  const designRef = adminDb.collection("designs").doc();
  const result = await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw notFound("Staff Artwork was not found.");
    const artwork = snap.data() ?? {};
    const processing =
      artwork.processing && typeof artwork.processing === "object"
        ? (artwork.processing as Record<string, unknown>)
        : {};
    const existing = typeof artwork.promotedDesignId === "string" && artwork.promotedDesignId.trim() ? artwork.promotedDesignId.trim() : null;
    if (existing && artwork.promotionStatus === "promoted") {
      return {
        designId: existing,
        alreadyPromoted: true,
        productionStoragePath: String(artwork.productionStoragePath ?? ""),
        previewStoragePath: String(artwork.previewStoragePath ?? ""),
        thumbnailStoragePath: String(artwork.thumbnailStoragePath ?? ""),
        originalPath: getOriginalStoragePath(existing),
        previewPath: getPreviewStoragePath(existing),
        thumbnailPath: getThumbnailStoragePath(existing),
        artworkSnapshot: artwork,
      };
    }
    if (existing) {
      tx.update(ref, { promotionStatus: "queued", promotionErrorMessage: null, updatedAt: FieldValue.serverTimestamp(), updatedBy: caller.id });
      return {
        designId: existing,
        alreadyPromoted: false,
        productionStoragePath: String(artwork.productionStoragePath ?? ""),
        previewStoragePath: typeof artwork.previewStoragePath === "string" ? artwork.previewStoragePath : "",
        thumbnailStoragePath: typeof artwork.thumbnailStoragePath === "string" ? artwork.thumbnailStoragePath : "",
        originalPath: getOriginalStoragePath(existing),
        previewPath: getPreviewStoragePath(existing),
        thumbnailPath: getThumbnailStoragePath(existing),
        artworkSnapshot: artwork,
      };
    }
    if (artwork.status !== "ready" || typeof artwork.productionStoragePath !== "string") {
      throw failedPrecondition("Only ready Staff Artwork can be sent to AI Review.");
    }
    const designId = designRef.id;
    const artworkBackgroundHex =
      typeof artwork.artworkBackgroundHex === "string" && artwork.artworkBackgroundHex.trim()
        ? artwork.artworkBackgroundHex.trim().toLowerCase()
        : null;
    tx.set(designRef, withoutUndefinedFields({
      id: designId,
      title: typeof artwork.title === "string" ? artwork.title : "Staff Artwork",
      description: typeof artwork.description === "string" ? artwork.description : undefined,
      tags: [],
      status: "imported",
      originalPath: getOriginalStoragePath(designId),
      previewPath: getPreviewStoragePath(designId),
      thumbnailPath: getThumbnailStoragePath(designId),
      width: typeof processing.widthPx === "number" ? processing.widthPx : undefined,
      height: typeof processing.heightPx === "number" ? processing.heightPx : undefined,
      printWidthInches: typeof processing.printWidthInches === "number" ? processing.printWidthInches : undefined,
      printHeightInches: typeof processing.printHeightInches === "number" ? processing.printHeightInches : undefined,
      effectiveDpi: typeof processing.effectiveDpi === "number" ? processing.effectiveDpi : undefined,
      printSizeSource: "import_normalized",
      uploadedBy: caller.id,
      sourceStaffArtworkId: id,
      ...(artworkBackgroundHex
        ? {
            artworkBackgroundSource: "staff_manual",
            artworkBackgroundHex,
          }
        : {}),
      queueCount: 0,
      aiProcessed: false,
      aiReviewed: false,
      aiReviewStatus: "pending",
      createdBy: caller.id,
      updatedBy: caller.id,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }));
    tx.update(ref, { promotedDesignId: designId, promotionStatus: "queued", promotionRequestedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), updatedBy: caller.id });
    return {
      designId,
      alreadyPromoted: false,
      productionStoragePath: String(artwork.productionStoragePath),
      previewStoragePath: typeof artwork.previewStoragePath === "string" ? artwork.previewStoragePath : "",
      thumbnailStoragePath: typeof artwork.thumbnailStoragePath === "string" ? artwork.thumbnailStoragePath : "",
      originalPath: getOriginalStoragePath(designId),
      previewPath: getPreviewStoragePath(designId),
      thumbnailPath: getThumbnailStoragePath(designId),
      artworkSnapshot: artwork,
    };
  });
  if (!result.alreadyPromoted) {
    try {
      const bucket = adminStorage.bucket();
      const productionObject = storageObjectPath(result.productionStoragePath);
      const [productionExists] = await bucket.file(productionObject).exists();
      if (!productionExists) {
        throw failedPrecondition("Staff Artwork production file was not found. Re-upload or finalize the artwork, then try again.");
      }
      await bucket.file(productionObject).copy(bucket.file(storageObjectPath(result.originalPath)));
      if (result.previewStoragePath) await bucket.file(storageObjectPath(result.previewStoragePath)).copy(bucket.file(storageObjectPath(result.previewPath)));
      if (result.thumbnailStoragePath) await bucket.file(storageObjectPath(result.thumbnailStoragePath)).copy(bucket.file(storageObjectPath(result.thumbnailPath)));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to copy Staff Artwork into the Design Library.";
      await ref.update({ promotionStatus: "failed", promotionErrorMessage: message, updatedAt: FieldValue.serverTimestamp(), updatedBy: caller.id });
      if (typeof error === "object" && error && "code" in error) throw error;
      throw failedPrecondition(message);
    }
  }

  // After a successful catalog handoff, remove the private Staff Artwork entirely.
  const latestSnap = await ref.get();
  if (latestSnap.exists) {
    await deleteStaffArtworkStorageAndDoc(id, latestSnap.data() ?? result.artworkSnapshot);
  }

  return {
    staffArtworkId: id,
    designId: result.designId,
    alreadyPromoted: result.alreadyPromoted,
    removedFromStaffLibrary: true,
    catalogReviewStatus: "sent_to_ai_review" as const,
    enqueueAttempted: false,
    enqueueQueued: false,
    enqueueReason: "deferred_to_client" as const,
  };
});

// Keep the root name referenced so path audits can identify this namespace in the Functions closure.
export const STAFF_ARTWORK_ROOT = STAFF_ARTWORK_STORAGE_ROOT;
