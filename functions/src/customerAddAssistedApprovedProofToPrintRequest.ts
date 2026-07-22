import {
  FieldValue,
  type DocumentReference,
  type DocumentSnapshot,
} from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

import {
  ASSISTED_CREATION_COLLECTION,
  ASSISTED_CREATION_MAX_PROOF_BYTES,
} from "../../packages/shared/src/constants/assistedCreation/assistedCreation.constants";
import { CUSTOMER_UPLOAD_COLLECTIONS } from "../../packages/shared/src/constants/customerUpload/customerUploadCollections.constants";
import {
  getCustomerUploadPreviewStoragePath,
  getCustomerUploadProductionStoragePath,
  getCustomerUploadSourceStoragePath,
  getCustomerUploadThumbnailStoragePath,
} from "../../packages/shared/src/constants/customerUpload/customerUploadStoragePaths";
import type {
  CustomerAddAssistedApprovedProofToPrintRequestRequest,
  CustomerAddAssistedApprovedProofToPrintRequestResponse,
} from "../../packages/shared/src/types/assistedCreation/assistedCreationActions.types";
import type { AssistedCreationProof } from "../../packages/shared/src/types/assistedCreation/assistedCreation.types";
import { CUSTOMER_UPLOAD_TERMS_VERSION } from "../../packages/shared/src/types/customerUpload/customerUpload.types";
import { evaluateAssistedApprovedProofAddToRequest } from "../../packages/shared/src/utils/assistedCreationApprovedProofAddToRequest";
import { formatFileSize } from "../../packages/shared/src/utils/formatFileSize";
import { resolveInitialPrintRequestItemSize } from "../../packages/shared/src/utils/printRequestItemSizing";

import { adminDb, adminStorage } from "./lib/admin";
import {
  approvedProofStorageFile,
  resolveAssistedCreationApprovedProofDownload,
} from "./lib/assistedCreationApprovedProofDownload";
import {
  proofsToRetentionViews,
  timestampMillis,
} from "./lib/assistedCreationProofPurge";
import {
  processCustomerUploadImageBytes,
  saveCustomerUploadProcessedOutputs,
} from "./lib/customerUploadProcessing";
import {
  failedPrecondition,
  internal,
  invalidArgument,
  permissionDenied,
  unauthenticated,
} from "./lib/errors";
import { buildCatalogIntakeConfirmationPatch } from "./lib/customerUploadCatalogConfirmation";
import { withoutUndefinedFields } from "./lib/firestoreDocument";
import { loadPrintRequestLimitSettings } from "./lib/loadPrintRequestLimitSettings";
import { requirePortalCustomer, type PortalCustomerContext } from "./lib/portalCustomer";
import { assertWorkingRequestAllowsPrintAdds } from "./lib/printRequestWorkingRequestMax";
import { resolveOrCreateWorkingPrintRequestInTransaction } from "./lib/portalWorkingPrintRequest";
import { storageObjectPath } from "./lib/storageObjectPath";
import { sumPrintRequestItemQuantities } from "../../packages/shared/src/utils/portalShowQueueCapacity";

function mapHttpsError(error: unknown): never {
  if (error instanceof HttpsError) {
    throw error;
  }
  if (error instanceof Error) {
    throw invalidArgument(error.message);
  }
  throw internal("Unable to add this design to your request right now.");
}

function resolveAttachPrintSize(upload: {
  widthPx?: unknown;
  heightPx?: unknown;
  printWidthInches?: unknown;
  printHeightInches?: unknown;
  approvedMaxPrintWidthInches?: unknown;
  approvedMaxPrintHeightInches?: unknown;
}): { printWidthInches?: number; printHeightInches?: number } {
  const widthPx = typeof upload.widthPx === "number" ? upload.widthPx : null;
  const heightPx = typeof upload.heightPx === "number" ? upload.heightPx : null;
  const defaultPrintWidthInches =
    typeof upload.printWidthInches === "number" ? upload.printWidthInches : undefined;

  if (widthPx && heightPx && widthPx > 0 && heightPx > 0) {
    try {
      const initial = resolveInitialPrintRequestItemSize({
        pixelWidth: widthPx,
        pixelHeight: heightPx,
        defaultPrintWidthInches,
        approvedMaxPrintWidthInches:
          typeof upload.approvedMaxPrintWidthInches === "number"
            ? upload.approvedMaxPrintWidthInches
            : undefined,
        approvedMaxPrintHeightInches:
          typeof upload.approvedMaxPrintHeightInches === "number"
            ? upload.approvedMaxPrintHeightInches
            : undefined,
      });
      return {
        printWidthInches: initial.printWidthInches,
        printHeightInches: initial.printHeightInches,
      };
    } catch {
      // Fall through to stored inches.
    }
  }

  return {
    printWidthInches:
      typeof upload.printWidthInches === "number" ? upload.printWidthInches : undefined,
    printHeightInches:
      typeof upload.printHeightInches === "number" ? upload.printHeightInches : undefined,
  };
}

function parseIngest(data: Record<string, unknown> | undefined): {
  customerUploadId: string;
  printRequestItemId: string;
  printRequestId: string;
  assistedProofId: string;
  catalogUseAcknowledged?: boolean;
} | null {
  const ingest = data?.printRequestIngest;
  if (!ingest || typeof ingest !== "object") {
    return null;
  }
  const record = ingest as Record<string, unknown>;
  const customerUploadId =
    typeof record.customerUploadId === "string" ? record.customerUploadId.trim() : "";
  const printRequestItemId =
    typeof record.printRequestItemId === "string" ? record.printRequestItemId.trim() : "";
  const printRequestId =
    typeof record.printRequestId === "string" ? record.printRequestId.trim() : "";
  const assistedProofId =
    typeof record.assistedProofId === "string" ? record.assistedProofId.trim() : "";
  if (!customerUploadId || !printRequestItemId || !printRequestId) {
    return null;
  }
  return {
    customerUploadId,
    printRequestItemId,
    printRequestId,
    assistedProofId,
    ...(typeof record.catalogUseAcknowledged === "boolean"
      ? { catalogUseAcknowledged: record.catalogUseAcknowledged }
      : {}),
  };
}

function validateRequest(data: unknown): CustomerAddAssistedApprovedProofToPrintRequestRequest {
  if (!data || typeof data !== "object") {
    throw new Error("Request payload is required.");
  }
  const record = data as { requestId?: unknown; catalogUseAcknowledged?: unknown };
  const requestId = typeof record.requestId === "string" ? record.requestId.trim() : "";
  if (!requestId) {
    throw new Error("Request id is required.");
  }
  // Same as print-upload attach: require explicit boolean. Missing → declined (false), still intake.
  if (typeof record.catalogUseAcknowledged !== "boolean") {
    return { requestId, catalogUseAcknowledged: false };
  }
  return { requestId, catalogUseAcknowledged: record.catalogUseAcknowledged };
}

function resolveTitleSnapshot(
  fileName: string,
  assisted: Record<string, unknown>,
): string {
  const fromFile = fileName.trim();
  if (fromFile) {
    return fromFile.slice(0, 180);
  }
  const answers = assisted.answers;
  if (answers && typeof answers === "object") {
    const raw = (answers as { rawDescription?: unknown }).rawDescription;
    if (typeof raw === "string" && raw.trim()) {
      return raw.trim().slice(0, 80);
    }
  }
  return "Assisted design";
}

/**
 * Portal: copy approved Assisted proof into customer-upload storage and attach to
 * Current Request. Runs the same trim/upscale/sizing pipeline as finalizeCustomerUpload,
 * but skips customer transparency / “good image” rejection gates (staff-approved art).
 */
export const customerAddAssistedApprovedProofToPrintRequest = onCall(
  { timeoutSeconds: 540, memory: "2GiB" },
  async (request): Promise<CustomerAddAssistedApprovedProofToPrintRequestResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    try {
      const portalCustomer = await requirePortalCustomer(request.auth.uid);
      const payload = validateRequest(request.data);
      const customerUid = request.auth.uid;
      const settings = await loadPrintRequestLimitSettings();
      const maxPerRequest = settings.maxQuantityPerShowPerCustomer;
      const assistedRef = adminDb.collection(ASSISTED_CREATION_COLLECTION).doc(payload.requestId);

      const assistedSnap = await assistedRef.get();
      if (!assistedSnap.exists) {
        throw invalidArgument("Assisted creation request was not found.");
      }

      const assisted = assistedSnap.data() ?? {};
      if (assisted.customerUid !== customerUid) {
        throw permissionDenied("You can only add your own approved design to a request.");
      }

      if (
        assisted.fulfillmentMode === "catalog_share" ||
        (typeof assisted.approvedCatalogDesignId === "string" &&
          assisted.approvedCatalogDesignId.trim() &&
          !(typeof assisted.approvedProofId === "string" && assisted.approvedProofId.trim()))
      ) {
        throw failedPrecondition(
          "This request was fulfilled with a Design Library match. Add that catalog design to your Current Request instead.",
        );
      }

      const proofs = Array.isArray(assisted.proofs)
        ? (assisted.proofs as AssistedCreationProof[])
        : [];
      const status = typeof assisted.status === "string" ? assisted.status : "";
      const existingIngest = parseIngest(assisted);
      const approvedProofId =
        typeof assisted.approvedProofId === "string" && assisted.approvedProofId.trim()
          ? assisted.approvedProofId.trim()
          : "";
      const hasFinalSource =
        assisted.finalSource &&
        typeof assisted.finalSource === "object" &&
        typeof (assisted.finalSource as { storagePath?: unknown }).storagePath === "string" &&
        Boolean(
          ((assisted.finalSource as { storagePath: string }).storagePath ?? "").trim(),
        );

      const eligibility = evaluateAssistedApprovedProofAddToRequest({
        status,
        approvedProofId: approvedProofId || null,
        approvedAtMillis: timestampMillis(assisted.approvedAt),
        proofs: proofsToRetentionViews(proofs),
        printRequestIngest: existingIngest,
        nowMs: Date.now(),
      });

      // Prefer final source when present (ADR-FP-110); still allow legacy proof-only approvals.
      const eligibleViaFinalSource = status === "approved" && hasFinalSource;
      if (!eligibility.eligible && !eligibleViaFinalSource) {
        if (eligibility.reason === "not_approved") {
          throw failedPrecondition("This request is not approved yet.");
        }
        throw failedPrecondition(
          "This design is no longer available to add. The full-resolution file may have expired.",
        );
      }

      if (existingIngest) {
        const uploadSnap = await adminDb
          .collection(CUSTOMER_UPLOAD_COLLECTIONS.customerUploads)
          .doc(existingIngest.customerUploadId)
          .get();
        const uploadOwned =
          uploadSnap.exists && uploadSnap.data()?.customerUid === customerUid;

        if (uploadOwned) {
          return await ensureIngestOnWorkingRequest({
            portalCustomer,
            customerUid,
            assistedRef,
            existingIngest,
            uploadTitleFallback: "Assisted design",
            catalogUseAcknowledged: payload.catalogUseAcknowledged,
            uploadSnap,
            maxPerRequest,
          });
        }

        // Sticky printRequestIngest can outlive a wiped/deleted upload (ingest survives
        // remove-from-request). Clear the orphan pointer and fall through to fresh copy.
        await assistedRef.update({
          printRequestIngest: FieldValue.delete(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      const resolvedProof = await resolveAssistedCreationApprovedProofDownload({
        uid: customerUid,
        requestId: payload.requestId,
      });

      const proofFile = approvedProofStorageFile(resolvedProof.storagePath);
      const [exists] = await proofFile.exists();
      if (!exists) {
        throw failedPrecondition(
          "This design is no longer available to add. The full-resolution file may have expired.",
        );
      }

      const [meta] = await proofFile.getMetadata();
      const sizeBytes = Number(meta.size ?? 0);
      if (sizeBytes <= 0 || sizeBytes > ASSISTED_CREATION_MAX_PROOF_BYTES) {
        throw failedPrecondition(
          `Proof file is ${formatFileSize(sizeBytes)} and exceeds the allowed size.`,
        );
      }

      const batchRef = adminDb.collection(CUSTOMER_UPLOAD_COLLECTIONS.customerUploadBatches).doc();
      const uploadRef = adminDb.collection(CUSTOMER_UPLOAD_COLLECTIONS.customerUploads).doc();
      const batchId = batchRef.id;
      const uploadId = uploadRef.id;

      const sourceStoragePath = getCustomerUploadSourceStoragePath(customerUid, uploadId);
      const productionStoragePath = getCustomerUploadProductionStoragePath(customerUid, uploadId);
      const previewStoragePath = getCustomerUploadPreviewStoragePath(customerUid, uploadId);
      const thumbnailStoragePath = getCustomerUploadThumbnailStoragePath(customerUid, uploadId);

      const bucket = adminStorage.bucket();
      const sourceObjectPath = storageObjectPath(sourceStoragePath);
      const sourceFile = bucket.file(sourceObjectPath);
      const contentType = resolvedProof.contentType || "application/octet-stream";

      // Parallel: in-bucket copy to customer-upload source + download once for derivatives.
      const [, downloadResult] = await Promise.all([
        proofFile.copy(sourceFile).then(() =>
          sourceFile.setMetadata({
            contentType,
            cacheControl: "private, max-age=3600",
          }),
        ),
        proofFile.download(),
      ]);
      const sourceBytes = downloadResult[0];

      // Same resize/DPI/approvedMax path as normal uploads; only skip quality gates.
      const processed = await processCustomerUploadImageBytes(sourceBytes, {
        skipCustomerQualityGates: true,
      });
      if (!processed.ok) {
        throw failedPrecondition(processed.message);
      }

      await saveCustomerUploadProcessedOutputs({
        bucket,
        sourceObjectPath,
        productionObjectPath: storageObjectPath(productionStoragePath),
        previewObjectPath: storageObjectPath(previewStoragePath),
        thumbnailObjectPath: storageObjectPath(thumbnailStoragePath),
        processed,
      });

      const titleSnapshot = resolveTitleSnapshot(resolvedProof.fileName, assisted);
      const printSize = resolveAttachPrintSize({
        widthPx: processed.widthPx,
        heightPx: processed.heightPx,
        printWidthInches: processed.printWidthInches,
        printHeightInches: processed.printHeightInches,
        approvedMaxPrintWidthInches: processed.approvedMaxPrintWidthInches,
        approvedMaxPrintHeightInches: processed.approvedMaxPrintHeightInches,
      });

      let printRequestId = "";
      let printRequestItemId = "";
      let createdFresh = false;

      await adminDb.runTransaction(async (tx) => {
        const freshAssisted = await tx.get(assistedRef);
        const freshIngest = parseIngest(freshAssisted.data());
        if (freshIngest) {
          printRequestId = freshIngest.printRequestId;
          printRequestItemId = freshIngest.printRequestItemId;
          return;
        }

        const resolved = await resolveOrCreateWorkingPrintRequestInTransaction(tx, {
          customerId: portalCustomer.customerId,
          userId: customerUid,
          username: portalCustomer.username,
          displayName: portalCustomer.displayName,
        });
        printRequestId = resolved.printRequestId;
        const requestRef = adminDb.collection("printRequests").doc(printRequestId);

        let currentItemCount = 0;
        let currentPrintCount = 0;
        if (!resolved.created) {
          const requestSnap = await tx.get(requestRef);
          currentItemCount = Number(requestSnap.data()?.itemCount ?? 0);
          const itemsSnap = await tx.get(
            adminDb.collection("printRequestItems").where("printRequestId", "==", printRequestId),
          );
          currentPrintCount = sumPrintRequestItemQuantities(
            itemsSnap.docs.map((docSnap) => {
              const qty = Number(docSnap.data()?.quantity ?? 1);
              return {
                quantity: Number.isFinite(qty) && qty > 0 ? Math.floor(qty) : 1,
              };
            }),
          );
        }

        const now = FieldValue.serverTimestamp();
        const itemRef = adminDb.collection("printRequestItems").doc();
        printRequestItemId = itemRef.id;
        createdFresh = true;
        // Same intake confirmation as print-upload attach / donate (shared helper).
        const intakeConfirmation = buildCatalogIntakeConfirmationPatch({
          catalogUseAcknowledged: payload.catalogUseAcknowledged,
          termsVersion: CUSTOMER_UPLOAD_TERMS_VERSION,
          printRequestId,
          now,
        });

        assertWorkingRequestAllowsPrintAdds({
          currentPrintCount,
          addCount: 1,
          maxPerRequest,
        });

        tx.set(
          batchRef,
          withoutUndefinedFields({
            id: batchId,
            customerUid,
            customerId: portalCustomer.customerId,
            purpose: "print_request",
            printRequestId,
            status: "confirmed",
            fileCount: 1,
            readyCount: 1,
            failedCount: 0,
            ownershipConfirmed: true,
            catalogUseAcknowledged: payload.catalogUseAcknowledged,
            termsVersion: CUSTOMER_UPLOAD_TERMS_VERSION,
            confirmedAt: now,
            createdBy: customerUid,
            createdAt: now,
            updatedAt: now,
            assistedCreationRequestId: payload.requestId,
          }),
        );

        tx.set(
          uploadRef,
          withoutUndefinedFields({
            id: uploadId,
            batchId,
            customerUid,
            customerId: portalCustomer.customerId,
            purpose: "print_request",
            printRequestId,
            originalFilename: titleSnapshot,
            sourceFormat: processed.sourceFormat,
            sourceStoragePath,
            productionStoragePath,
            previewStoragePath,
            thumbnailStoragePath,
            sourceWidthPx: processed.sourceWidthPx,
            sourceHeightPx: processed.sourceHeightPx,
            widthPx: processed.widthPx,
            heightPx: processed.heightPx,
            wasUpscaled: processed.wasUpscaled,
            wasTrimmed: processed.wasTrimmed,
            upscaleFactor: processed.upscaleFactor,
            upscalePassCount: processed.upscalePassCount,
            approvedMaxPrintWidthInches: processed.approvedMaxPrintWidthInches,
            approvedMaxPrintHeightInches: processed.approvedMaxPrintHeightInches,
            sizingPolicyVersion: processed.sizingPolicyVersion,
            sizingWarningCode: processed.sizingWarningCode ?? null,
            transparencyPassed: true,
            transparentPixelRatio: processed.transparentPixelRatio,
            printWidthInches: processed.printWidthInches,
            printHeightInches: processed.printHeightInches,
            effectiveDpi: processed.effectiveDpi,
            technicalStatus: "ready",
            technicalProgressStage: null,
            technicalFailureCode: null,
            technicalFailureMessage: null,
            promotedDesignId: null,
            ...intakeConfirmation,
            assistedCreationRequestId: payload.requestId,
            assistedProofId: approvedProofId || null,
            createdAt: now,
          }),
        );

        tx.set(
          itemRef,
          withoutUndefinedFields({
            id: itemRef.id,
            printRequestId,
            sourceType: "customer_upload",
            customerUploadId: uploadId,
            titleSnapshot,
            quantity: 1,
            printWidthInches: printSize.printWidthInches,
            printHeightInches: printSize.printHeightInches,
            status: "pending",
            addedBy: customerUid,
            createdAt: now,
            updatedAt: now,
          }),
        );

        tx.update(requestRef, {
          itemCount: resolved.created ? 1 : currentItemCount + 1,
          updatedAt: now,
          updatedBy: customerUid,
        });

        tx.update(assistedRef, {
          printRequestIngest: {
            customerUploadId: uploadId,
            printRequestItemId: itemRef.id,
            printRequestId,
            assistedProofId: approvedProofId,
            catalogUseAcknowledged: payload.catalogUseAcknowledged,
            ingestedAt: now,
          },
          updatedAt: now,
        });
      });

      if (!createdFresh) {
        const afterIngest = parseIngest((await assistedRef.get()).data());
        if (afterIngest) {
          return {
            printRequestId: afterIngest.printRequestId,
            printRequestItemId: afterIngest.printRequestItemId,
            customerUploadId: afterIngest.customerUploadId,
            alreadyAttached: true,
          };
        }
      }

      return {
        printRequestId,
        printRequestItemId,
        customerUploadId: uploadId,
        alreadyAttached: false,
      };
    } catch (error) {
      mapHttpsError(error);
    }
  },
);

async function ensureIngestOnWorkingRequest(input: {
  portalCustomer: PortalCustomerContext;
  customerUid: string;
  assistedRef: DocumentReference;
  existingIngest: {
    customerUploadId: string;
    printRequestItemId: string;
    printRequestId: string;
    assistedProofId: string;
    catalogUseAcknowledged?: boolean;
  };
  uploadTitleFallback: string;
  catalogUseAcknowledged: boolean;
  uploadSnap: DocumentSnapshot;
  maxPerRequest: number;
}): Promise<CustomerAddAssistedApprovedProofToPrintRequestResponse> {
  const {
    portalCustomer,
    customerUid,
    assistedRef,
    existingIngest,
    catalogUseAcknowledged,
    uploadSnap,
    maxPerRequest,
  } = input;

  const upload = uploadSnap.data() ?? {};

  const buildIngestPointer = (printRequestItemId: string, printRequestId: string) =>
    withoutUndefinedFields({
      customerUploadId: existingIngest.customerUploadId,
      printRequestItemId,
      printRequestId,
      assistedProofId: existingIngest.assistedProofId || "",
      catalogUseAcknowledged,
      ingestedAt: FieldValue.serverTimestamp(),
    });

  const buildUploadPatch = (intakeConfirmation: Record<string, unknown>) => {
    const hasOrigin =
      typeof upload.assistedCreationRequestId === "string" &&
      Boolean(String(upload.assistedCreationRequestId).trim());
    return withoutUndefinedFields({
      ...intakeConfirmation,
      // Backfill origin marker if an older ingest doc lacked it (Custom pill).
      ...(hasOrigin
        ? {}
        : {
            assistedCreationRequestId: assistedRef.id,
            assistedProofId: existingIngest.assistedProofId || null,
          }),
    });
  };

  let printRequestId = "";
  let printRequestItemId = existingIngest.printRequestItemId;
  let alreadyAttached = true;

  await adminDb.runTransaction(async (tx) => {
    const resolved = await resolveOrCreateWorkingPrintRequestInTransaction(tx, {
      customerId: portalCustomer.customerId,
      userId: customerUid,
      username: portalCustomer.username,
      displayName: portalCustomer.displayName,
    });
    printRequestId = resolved.printRequestId;
    const requestRef = adminDb.collection("printRequests").doc(printRequestId);
    const now = FieldValue.serverTimestamp();
    const intakeConfirmation = buildCatalogIntakeConfirmationPatch({
      catalogUseAcknowledged,
      termsVersion: CUSTOMER_UPLOAD_TERMS_VERSION,
      printRequestId,
      now,
    });

    if (!resolved.created) {
      const existingItemSnap = await tx.get(
        adminDb.collection("printRequestItems").doc(existingIngest.printRequestItemId),
      );
      if (
        existingItemSnap.exists &&
        existingItemSnap.data()?.printRequestId === printRequestId &&
        existingItemSnap.data()?.customerUploadId === existingIngest.customerUploadId
      ) {
        alreadyAttached = true;
        printRequestItemId = existingItemSnap.id;
        tx.update(uploadSnap.ref, buildUploadPatch(intakeConfirmation));
        tx.update(assistedRef, {
          printRequestIngest: buildIngestPointer(printRequestItemId, printRequestId),
          updatedAt: now,
        });
        return;
      }

      const byUploadSnap = await tx.get(
        adminDb
          .collection("printRequestItems")
          .where("printRequestId", "==", printRequestId)
          .where("customerUploadId", "==", existingIngest.customerUploadId)
          .limit(1),
      );
      if (!byUploadSnap.empty) {
        alreadyAttached = true;
        printRequestItemId = byUploadSnap.docs[0].id;
        tx.update(uploadSnap.ref, buildUploadPatch(intakeConfirmation));
        tx.update(assistedRef, {
          printRequestIngest: buildIngestPointer(printRequestItemId, printRequestId),
          updatedAt: now,
        });
        return;
      }
    }

    alreadyAttached = false;
    const itemRef = adminDb.collection("printRequestItems").doc();
    printRequestItemId = itemRef.id;

    let currentItemCount = 0;
    let currentPrintCount = 0;
    if (!resolved.created) {
      const requestSnap = await tx.get(requestRef);
      currentItemCount = Number(requestSnap.data()?.itemCount ?? 0);
      const itemsSnap = await tx.get(
        adminDb.collection("printRequestItems").where("printRequestId", "==", printRequestId),
      );
      currentPrintCount = sumPrintRequestItemQuantities(
        itemsSnap.docs.map((docSnap) => {
          const qty = Number(docSnap.data()?.quantity ?? 1);
          return {
            quantity: Number.isFinite(qty) && qty > 0 ? Math.floor(qty) : 1,
          };
        }),
      );
    }

    const titleSnapshot =
      typeof upload.originalFilename === "string" && upload.originalFilename.trim()
        ? upload.originalFilename.trim()
        : input.uploadTitleFallback;
    const printSize = resolveAttachPrintSize(upload);

    assertWorkingRequestAllowsPrintAdds({
      currentPrintCount,
      addCount: 1,
      maxPerRequest,
    });

    tx.set(
      itemRef,
      withoutUndefinedFields({
        id: itemRef.id,
        printRequestId,
        sourceType: "customer_upload",
        customerUploadId: existingIngest.customerUploadId,
        titleSnapshot,
        quantity: 1,
        printWidthInches: printSize.printWidthInches,
        printHeightInches: printSize.printHeightInches,
        status: "pending",
        addedBy: customerUid,
        createdAt: now,
        updatedAt: now,
      }),
    );

    tx.update(requestRef, {
      itemCount: resolved.created ? 1 : currentItemCount + 1,
      updatedAt: now,
      updatedBy: customerUid,
    });

    tx.update(uploadSnap.ref, buildUploadPatch(intakeConfirmation));

    tx.update(assistedRef, {
      printRequestIngest: buildIngestPointer(printRequestItemId, printRequestId),
      updatedAt: now,
    });
  });

  return {
    printRequestId,
    printRequestItemId,
    customerUploadId: existingIngest.customerUploadId,
    alreadyAttached,
  };
}
