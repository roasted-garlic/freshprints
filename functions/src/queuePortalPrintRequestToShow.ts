import { FieldValue } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";

import { CUSTOMER_UPLOAD_COLLECTIONS } from "../../packages/shared/src/constants/customerUpload/customerUploadCollections.constants";
import { PRINT_REQUEST_QUOTA_ERROR_CODES } from "../../packages/shared/src/constants/printRequest/printRequestQuotaErrorCodes.constants";
import type { QueuePortalPrintRequestToShowResponse } from "../../packages/shared/src/types/portal/queuePortalPrintRequestToShow.types";
import {
  formatShowAllocationBlockedMessage,
  getShowAllocationBlockReason,
} from "../../packages/shared/src/utils/showAllocationEligibility";
import type { ShowProductionStatus } from "../../packages/shared/src/types/upcomingShow/upcomingShow.enums";
import {
  PORTAL_QUEUE_CUTOFF_PASSED_MESSAGE,
  isPastPortalQueueCutoff,
} from "../../packages/shared/src/utils/showQueueCutoff";
import {
  canFitPrintRequestOnShow,
  formatShowCapacityExceededMessage,
} from "../../packages/shared/src/utils/portalShowQueueCapacity";
import {
  formatPortalShowDoesNotFitEntireRequestMessage,
  planPortalShowQueueFit,
  remainingPerShowCustomerCap,
  remainingUnallocatedQuantityForItem,
  sumAllocatedQuantityByItemId,
  sumRemainingUnallocatedQuantity,
} from "../../packages/shared/src/utils/portalShowQueueFit";
import {
  perShowCustomerCapExceededMessage,
  sumCustomerQuantityOnShow,
  wouldExceedPerShowCustomerCap,
} from "../../packages/shared/src/utils/printRequestPerShowCustomerCap";
import { buildShowAllocationSourceFields } from "../../packages/shared/src/utils/showAllocationSourceFields";
import {
  formatWorkingRequestOverLimitForQueueMessage,
} from "../../packages/shared/src/utils/printRequestWorkingRequestMax";
import {
  printRequestLimitPerCustomerPerShow,
  printRequestLimitPerRequest,
} from "../../packages/shared/src/constants/printRequest/printRequestLimitSettings.constants";
import { adminDb } from "./lib/admin";
import { failedPrecondition, internal, invalidArgument, unauthenticated } from "./lib/errors";
import { withoutUndefinedFields } from "./lib/firestoreDocument";
import { loadPortalQueueCutoffHours } from "./lib/loadPortalQueueCutoffHours";
import { loadPrintRequestLimitSettings } from "./lib/loadPrintRequestLimitSettings";
import { requirePortalCustomer } from "./lib/portalCustomer";
import { validateQueuePortalPrintRequestToShowRequest } from "./lib/queuePortalPrintRequestToShowValidation";
import { getPortalQueueTransactionBlockReason } from "./lib/portalQueueTransactionEligibility";

function mapHttpsError(error: unknown): never {
  if (error instanceof Error && "code" in error) {
    throw error;
  }

  if (error instanceof Error) {
    throw invalidArgument(error.message);
  }

  throw internal("Unable to queue print request right now.");
}

const CONTINUABLE_STATUSES = new Set(["draft", "editing"]);

export const queuePortalPrintRequestToShow = onCall(async (request): Promise<QueuePortalPrintRequestToShowResponse> => {
  if (!request.auth?.uid) {
    throw unauthenticated();
  }

  const userId = request.auth.uid;
  const startedAtMs = Date.now();
  let validationStage = "authorization";
  let requestItemsReturned = 0;
  let requestItemQueryRan = false;
  let requestAllocationsReturned = 0;
  let showAllocationsReturned = 0;
  let uploadDocumentsReturned = 0;
  let transactionAttempts = 0;
  let transactionDocumentsReturned = 0;
  let totalWrites = 0;
  const logAccounting = (outcome: "success" | "failure", failureCode?: string) => {
    if (process.env.GCLOUD_PROJECT !== "fresh-prints-dev") return;
    logger.info("portal-show-queue-accounting", {
      functionName: "queuePortalPrintRequestToShow",
      eventClassification: "explicit-customer-submit",
      validationStage,
      authorizationReads: 2,
      requestReads: 1,
      requestItemQueryOperations: requestItemQueryRan ? 1 : 0,
      requestItemsReturned,
      showReads: 1,
      existingAllocationReads: requestAllocationsReturned,
      customerAllocationReads: showAllocationsReturned,
      limitSettingsReads: 2,
      uploadDocumentsReturned,
      transactionAttempts,
      transactionRetries: Math.max(0, transactionAttempts - 1),
      transactionDocumentsReturned,
      allocationWrites: totalWrites > 0 ? Math.max(0, totalWrites - 3) : 0,
      requestWrites: totalWrites > 0 ? 1 : 0,
      requestItemWrites: 0,
      counterWrites: totalWrites > 0 ? 2 : 0,
      idempotencyWrites: 0,
      totalWrites,
      documentsReturned:
        5 + requestItemsReturned + requestAllocationsReturned +
        showAllocationsReturned + uploadDocumentsReturned + transactionDocumentsReturned,
      durationMs: Date.now() - startedAtMs,
      outcome,
      duplicateSkip: false,
      ...(failureCode ? { failureCode } : {}),
    });
  };

  try {
    const customer = await requirePortalCustomer(userId);
    const payload = validateQueuePortalPrintRequestToShowRequest(request.data);
    const now = new Date();
    const portalQueueCutoffHours = await loadPortalQueueCutoffHours();

    validationStage = "request-eligibility";
    const requestSnap = await adminDb.collection("printRequests").doc(payload.printRequestId).get();

    if (!requestSnap.exists) {
      validationStage = "request-not-found";
      throw invalidArgument("Print request not found.");
    }

    const requestData = requestSnap.data()!;

    if (requestData.customerId !== customer.customerId) {
      validationStage = "request-ownership";
      throw failedPrecondition("You can only queue your own print requests.");
    }

    if (requestData.requestOrigin !== "portal_customer" || requestData.isInternal === true) {
      validationStage = "request-not-portal";
      throw failedPrecondition("This request cannot be queued from the portal.");
    }

    if (!CONTINUABLE_STATUSES.has(String(requestData.status))) {
      validationStage = "request-not-working";
      throw failedPrecondition("This request can no longer be queued to a show.");
    }

    validationStage = "show-eligibility";
    const showSnap = await adminDb.collection("upcomingShows").doc(payload.upcomingShowId).get();
    if (!showSnap.exists) {
      validationStage = "show-not-found";
      throw invalidArgument("Show not found.");
    }
    const showData = showSnap.data()!;
    if (showData.isArchived === true) {
      validationStage = "show-not-allocatable";
      throw failedPrecondition("This show is no longer available.");
    }

    validationStage = "request-items-and-existing-allocation";
    const [itemsSnap, allocationsSnap] = await Promise.all([
      adminDb.collection("printRequestItems").where("printRequestId", "==", payload.printRequestId).get(),
      adminDb.collection("showAllocations").where("printRequestId", "==", payload.printRequestId).get(),
    ]);
    requestItemQueryRan = true;
    requestItemsReturned = itemsSnap.size;
    requestAllocationsReturned = allocationsSnap.size;

    const items = itemsSnap.docs.map((itemDoc) => {
      const data = itemDoc.data();

      if (typeof data.quantity !== "number" || data.quantity <= 0) {
        throw invalidArgument("Print request item data is incomplete.");
      }

      const sourceType =
        data.sourceType === "customer_upload" ? ("customer_upload" as const) : ("catalog_design" as const);
      const customerUploadId =
        typeof data.customerUploadId === "string" ? data.customerUploadId.trim() : undefined;
      const designId = typeof data.designId === "string" ? data.designId.trim() : undefined;
      const titleSnapshot =
        typeof data.titleSnapshot === "string" ? data.titleSnapshot.trim() : undefined;

      return {
        id: itemDoc.id,
        ref: itemDoc.ref,
        data,
        sourceType,
        customerUploadId,
        designId,
        titleSnapshot,
        quantity: data.quantity as number,
        printWidthInches: typeof data.printWidthInches === "number" ? data.printWidthInches : undefined,
        printHeightInches: typeof data.printHeightInches === "number" ? data.printHeightInches : undefined,
        sizeLabel: typeof data.sizeLabel === "string" ? data.sizeLabel : undefined,
        sortOrder: typeof data.sortOrder === "number" ? data.sortOrder : undefined,
        status: typeof data.status === "string" ? data.status : "pending",
      };
    });

    if (items.length === 0) {
      validationStage = "request-has-no-items";
      throw failedPrecondition("Add at least one design before queuing to a show.");
    }

    const allocatedByItemId = sumAllocatedQuantityByItemId(
      allocationsSnap.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          printRequestItemId:
            typeof data.printRequestItemId === "string" ? data.printRequestItemId : "",
          allocatedQuantity: typeof data.allocatedQuantity === "number" ? data.allocatedQuantity : 0,
          status: typeof data.status === "string" ? data.status : "canceled",
        };
      }),
    );

    const hasExistingAllocation = [...allocatedByItemId.values()].some((qty) => qty > 0);
    if (hasExistingAllocation) {
      validationStage = "request-already-queued";
      throw failedPrecondition(
        "This request is already tied to a show. Each print request can only be added to one show.",
      );
    }

    const remainingByItemId = new Map(
      items.map((item) => {
        const remaining = remainingUnallocatedQuantityForItem(
          item.quantity,
          allocatedByItemId.get(item.id) ?? 0,
        );
        return [item.id, remaining] as const;
      }),
    );

    const totalRemaining = sumRemainingUnallocatedQuantity(items, allocatedByItemId);
    if (totalRemaining <= 0) {
      validationStage = "request-fully-queued";
      throw failedPrecondition("This request is already fully queued to shows.");
    }

    const settings = await loadPrintRequestLimitSettings();
    const maxPerRequest = printRequestLimitPerRequest(settings);
    const customerShowLimit = printRequestLimitPerCustomerPerShow(settings);

    if (totalRemaining > maxPerRequest) {
      validationStage = "working-request-over-limit";
      throw failedPrecondition(formatWorkingRequestOverLimitForQueueMessage(maxPerRequest), {
        code: PRINT_REQUEST_QUOTA_ERROR_CODES.WORKING_REQUEST_PRINT_LIMIT,
        cap: maxPerRequest,
        limit: maxPerRequest,
      });
    }

    const scheduledStartAt = showData.scheduledStartAt as { toDate: () => Date } | undefined;
    const allocatedQuantity =
      typeof showData.allocatedQuantity === "number" && showData.allocatedQuantity >= 0
        ? showData.allocatedQuantity
        : 0;
    const maxTotalQuantity =
      typeof showData.maxTotalQuantity === "number" && showData.maxTotalQuantity >= 0
        ? showData.maxTotalQuantity
        : undefined;
    const productionStatus = showData.productionStatus as ShowProductionStatus | undefined;
    const blockReason = getShowAllocationBlockReason(
      {
        scheduledStartAt,
        productionStatus,
        maxTotalQuantity,
        allocatedQuantity,
      },
      now,
    );

    if (blockReason) {
      validationStage = "show-allocation-blocked";
      throw failedPrecondition(formatShowAllocationBlockedMessage(blockReason), {
        code: PRINT_REQUEST_QUOTA_ERROR_CODES.SHOW_ALLOCATION_BLOCKED,
      });
    }

    if (isPastPortalQueueCutoff(scheduledStartAt, now, portalQueueCutoffHours)) {
      validationStage = "queue-cutoff-passed";
      throw failedPrecondition(PORTAL_QUEUE_CUTOFF_PASSED_MESSAGE, {
        code: PRINT_REQUEST_QUOTA_ERROR_CODES.SHOW_QUEUE_CUTOFF,
      });
    }

    const showAllocationsForShow = await adminDb
      .collection("showAllocations")
      .where("upcomingShowId", "==", payload.upcomingShowId)
      .get();
    showAllocationsReturned = showAllocationsForShow.size;

    const customerShowAllocations = showAllocationsForShow.docs
      .map((docSnap) => {
        const data = docSnap.data();
        return {
          printRequestId: typeof data.printRequestId === "string" ? data.printRequestId : "",
          allocatedQuantity:
            typeof data.allocatedQuantity === "number" ? data.allocatedQuantity : 0,
          status: typeof data.status === "string" ? data.status : "canceled",
          customerId: typeof data.customerId === "string" ? data.customerId : "",
        };
      })
      .filter((row) => row.customerId === customer.customerId);

    // ADR-FP-122 (2026-07-27): a customer may submit multiple separate print requests to the
    // same show, accumulating toward the shared per-customer-per-show limit `L` — the prior
    // unconditional "any existing allocation blocks" uniqueness rule (ADR-FP-102 Decision §5) is
    // removed. `existingOnShowQty` remains needed below for the actual quantity-cap math
    // (`remainingPerShowCustomerCap`/`planPortalShowQueueFit`), which already correctly sums
    // non-canceled allocations across however many separate requests this customer has here.
    const existingOnShowQty = sumCustomerQuantityOnShow(customerShowAllocations);

    const showRemainingCapacity =
      maxTotalQuantity === undefined ? undefined : Math.max(0, maxTotalQuantity - allocatedQuantity);
    const customerLimitRemaining = remainingPerShowCustomerCap(existingOnShowQty, customerShowLimit);
    const fit = planPortalShowQueueFit({
      requestedQuantity: totalRemaining,
      showRemainingCapacity,
      customerLimitRemaining,
    });

    if (!fit.fitsEntirely) {
      validationStage = "show-fit";
      const code =
        fit.limitingFactor === "show_capacity"
          ? PRINT_REQUEST_QUOTA_ERROR_CODES.SHOW_CAPACITY
          : PRINT_REQUEST_QUOTA_ERROR_CODES.SHOW_CUSTOMER_LIMIT;
      throw failedPrecondition(
        fit.isBlocked && fit.limitingFactor === "show_capacity"
          ? formatShowCapacityExceededMessage(totalRemaining, showRemainingCapacity ?? 0)
          : fit.isBlocked
            ? perShowCustomerCapExceededMessage({
                cap: customerShowLimit,
                existingOnShowQty,
                newRequestQty: totalRemaining,
              })
            : formatPortalShowDoesNotFitEntireRequestMessage({
                fittingQuantity: fit.fittingQuantity,
                totalQuantity: totalRemaining,
              }),
        {
          code,
          cap: customerShowLimit,
          remaining: showRemainingCapacity,
        },
      );
    }

    const queueLines = items
      .map((item) => ({
        item,
        quantity: remainingByItemId.get(item.id) ?? 0,
      }))
      .filter((line) => line.quantity > 0);

    const batchQuantity = queueLines.reduce((sum, line) => sum + line.quantity, 0);

    logger.info("queuePortalPrintRequestToShow.plan", {
      marker: "simple-request-per-show-v1",
      batchQuantity,
      totalRemaining,
      limitL: customerShowLimit,
    });

    const uploadIds = [
      ...new Set(
        queueLines
          .filter((line) => line.item.sourceType === "customer_upload")
          .map((line) => line.item.customerUploadId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    const uploadSnaps = await Promise.all(
      uploadIds.map((id) =>
        adminDb.collection(CUSTOMER_UPLOAD_COLLECTIONS.customerUploads).doc(id).get(),
      ),
    );
    uploadDocumentsReturned = uploadSnaps.filter((snap) => snap.exists).length;
    const uploadById = new Map(
      uploadSnaps.map((snap) => [snap.id, snap.exists ? snap.data() : null] as const),
    );

    for (const line of queueLines) {
      const item = line.item;
      if (item.sourceType === "customer_upload") {
        const uploadId = item.customerUploadId ?? "";
        const upload = uploadById.get(uploadId);
        if (!upload) {
          throw invalidArgument("A customer upload on this request was not found.");
        }
        if (upload.customerUid !== userId && upload.customerId !== customer.customerId) {
          throw failedPrecondition("You can only queue your own uploaded artwork.");
        }
        if (upload.technicalStatus !== "ready") {
          throw failedPrecondition("Only successfully processed uploads can be queued to a show.");
        }
        if (typeof upload.productionStoragePath !== "string" || !upload.productionStoragePath) {
          throw failedPrecondition("Upload production artwork is missing.");
        }
        continue;
      }

      if (!item.designId) {
        throw invalidArgument("Print request item data is incomplete.");
      }
    }

    if (wouldExceedPerShowCustomerCap(existingOnShowQty, batchQuantity, customerShowLimit)) {
      throw failedPrecondition(
        perShowCustomerCapExceededMessage({
          cap: customerShowLimit,
          existingOnShowQty,
          newRequestQty: batchQuantity,
        }),
        {
          code: PRINT_REQUEST_QUOTA_ERROR_CODES.SHOW_CUSTOMER_LIMIT,
          cap: customerShowLimit,
        },
      );
    }

    if (
      !canFitPrintRequestOnShow({
        totalQuantity: batchQuantity,
        maxTotalQuantity,
        allocatedQuantity,
      })
    ) {
      const remaining =
        maxTotalQuantity === undefined ? 0 : Math.max(0, maxTotalQuantity - allocatedQuantity);
      throw failedPrecondition(formatShowCapacityExceededMessage(batchQuantity, remaining), {
        code: PRINT_REQUEST_QUOTA_ERROR_CODES.SHOW_CAPACITY,
        remaining,
      });
    }

    const requestName =
      typeof requestData.name === "string" && requestData.name.trim()
        ? requestData.name.trim()
        : "Print request";

    const allocationIds: string[] = [];
    let allocatedTotal = 0;
    const timestamp = FieldValue.serverTimestamp();

    await adminDb.runTransaction(async (transaction) => {
      transactionAttempts += 1;
      allocationIds.length = 0;
      allocatedTotal = 0;

      const freshShowSnap = await transaction.get(showSnap.ref);
      const freshRequestSnap = await transaction.get(requestSnap.ref);
      const freshShowAllocationsSnap = await transaction.get(
        adminDb
          .collection("showAllocations")
          .where("upcomingShowId", "==", payload.upcomingShowId),
      );
      const freshRequestAllocationsSnap = await transaction.get(
        adminDb
          .collection("showAllocations")
          .where("printRequestId", "==", payload.printRequestId),
      );
      transactionDocumentsReturned +=
        (freshShowSnap.exists ? 1 : 0) +
        (freshRequestSnap.exists ? 1 : 0) +
        freshShowAllocationsSnap.size +
        freshRequestAllocationsSnap.size;

      if (!freshShowSnap.exists || !freshRequestSnap.exists) {
        throw invalidArgument("Print request or show no longer exists.");
      }

      const freshShow = freshShowSnap.data()!;
      const freshRequest = freshRequestSnap.data()!;
      const freshAllocated =
        typeof freshShow.allocatedQuantity === "number" && freshShow.allocatedQuantity >= 0
          ? freshShow.allocatedQuantity
          : 0;
      const freshMax =
        typeof freshShow.maxTotalQuantity === "number" && freshShow.maxTotalQuantity >= 0
          ? freshShow.maxTotalQuantity
          : undefined;

      if (!CONTINUABLE_STATUSES.has(String(freshRequest.status))) {
        throw failedPrecondition("This request can no longer be queued to a show.");
      }

      const freshRequestHasAllocation = freshRequestAllocationsSnap.docs.some((docSnap) => {
        const data = docSnap.data();
        const status = typeof data.status === "string" ? data.status : "canceled";
        const qty = typeof data.allocatedQuantity === "number" ? data.allocatedQuantity : 0;
        return status !== "canceled" && qty > 0;
      });
      // ADR-FP-122: no uniqueness block here either — freshCustomerOnShowQty (re-verified under
      // transaction lock) feeds only the actual quantity-cap check below (capRemaining).
      const freshCustomerOnShowQty = sumCustomerQuantityOnShow(
        freshShowAllocationsSnap.docs
          .map((docSnap) => docSnap.data())
          .filter((data) => data.customerId === customer.customerId)
          .map((data) => ({
            allocatedQuantity:
              typeof data.allocatedQuantity === "number" ? data.allocatedQuantity : 0,
            status: typeof data.status === "string" ? data.status : "canceled",
          })),
      );
      const transactionBlockReason = getPortalQueueTransactionBlockReason({
        requestHasExistingAllocation: freshRequestHasAllocation,
        existingCustomerQuantityOnShow: freshCustomerOnShowQty,
        newRequestQuantity: batchQuantity,
        customerShowCap: customerShowLimit,
      });
      if (transactionBlockReason === "request_already_allocated") {
        throw failedPrecondition(
          "This request is already tied to a show. Each print request can only be added to one show.",
        );
      }

      const freshScheduledStartAt = freshShow.scheduledStartAt as
        | { toDate: () => Date }
        | undefined;
      const freshBlockReason = getShowAllocationBlockReason(
        {
          scheduledStartAt: freshScheduledStartAt,
          productionStatus: freshShow.productionStatus as ShowProductionStatus | undefined,
          maxTotalQuantity: freshMax,
          allocatedQuantity: freshAllocated,
        },
        now,
      );
      if (freshBlockReason) {
        throw failedPrecondition(formatShowAllocationBlockedMessage(freshBlockReason), {
          code: PRINT_REQUEST_QUOTA_ERROR_CODES.SHOW_ALLOCATION_BLOCKED,
        });
      }

      if (isPastPortalQueueCutoff(freshScheduledStartAt, now, portalQueueCutoffHours)) {
        throw failedPrecondition(PORTAL_QUEUE_CUTOFF_PASSED_MESSAGE, {
          code: PRINT_REQUEST_QUOTA_ERROR_CODES.SHOW_QUEUE_CUTOFF,
        });
      }

      if (
        !canFitPrintRequestOnShow({
          totalQuantity: batchQuantity,
          maxTotalQuantity: freshMax,
          allocatedQuantity: freshAllocated,
        })
      ) {
        const remaining = freshMax === undefined ? 0 : Math.max(0, freshMax - freshAllocated);
        throw failedPrecondition(formatShowCapacityExceededMessage(batchQuantity, remaining), {
          code: PRINT_REQUEST_QUOTA_ERROR_CODES.SHOW_CAPACITY,
          remaining,
        });
      }

      if (transactionBlockReason === "customer_show_cap_exceeded") {
        throw failedPrecondition(
          perShowCustomerCapExceededMessage({
            cap: customerShowLimit,
            existingOnShowQty: freshCustomerOnShowQty,
            newRequestQty: batchQuantity,
          }),
          {
            code: PRINT_REQUEST_QUOTA_ERROR_CODES.SHOW_CUSTOMER_LIMIT,
            cap: customerShowLimit,
          },
        );
      }

      for (const line of queueLines) {
        const allocationRef = adminDb.collection("showAllocations").doc();
        allocationIds.push(allocationRef.id);
        allocatedTotal += line.quantity;

        const upload =
          line.item.sourceType === "customer_upload" && line.item.customerUploadId
            ? uploadById.get(line.item.customerUploadId)
            : null;
        const sourceFields = buildShowAllocationSourceFields({
          item: {
            sourceType: line.item.sourceType === "customer_upload" ? "customer_upload" : undefined,
            designId: line.item.designId,
            customerUploadId: line.item.customerUploadId,
            titleSnapshot: line.item.titleSnapshot,
            quantity: line.quantity,
            printWidthInches: line.item.printWidthInches,
            printHeightInches: line.item.printHeightInches,
            sizeLabel: line.item.sizeLabel,
          },
          uploadOriginalFilename:
            typeof upload?.originalFilename === "string" ? upload.originalFilename : null,
        });

        transaction.set(
          allocationRef,
          withoutUndefinedFields({
            upcomingShowId: payload.upcomingShowId,
            printRequestId: payload.printRequestId,
            printRequestItemId: line.item.id,
            ...sourceFields,
            customerId: customer.customerId,
            requestNameSnapshot: requestName,
            requestOriginSnapshot: "portal_customer",
            allocatedQuantity: line.quantity,
            sourceItemQuantitySnapshot: line.quantity,
            printWidthInches: line.item.printWidthInches,
            printHeightInches: line.item.printHeightInches,
            sizeLabel: line.item.sizeLabel,
            status: "pending",
            addedBy: userId,
            updatedBy: userId,
            createdAt: timestamp,
            updatedAt: timestamp,
          }),
        );
      }

      transaction.update(showSnap.ref, {
        allocatedQuantity: freshAllocated + allocatedTotal,
        updatedBy: userId,
        updatedAt: timestamp,
      });

      transaction.update(requestSnap.ref, {
        status: "active",
        itemCount: items.length,
        showQueueBiddingAcknowledgment: {
          accepted: true,
          acceptedAt: timestamp,
          acceptedByUid: userId,
          version: payload.biddingAcknowledgmentVersion,
          upcomingShowId: payload.upcomingShowId,
        },
        updatedBy: userId,
        updatedAt: timestamp,
      });

      transaction.update(adminDb.collection("users").doc(userId), {
        "portalBiddingAcknowledgments.lastQueueToShow": {
          acceptedAt: timestamp,
          version: payload.biddingAcknowledgmentVersion,
          source: "queue_to_show",
          printRequestId: payload.printRequestId,
          upcomingShowId: payload.upcomingShowId,
        },
        updatedAt: timestamp,
        updatedBy: userId,
      });
    });
    totalWrites = allocationIds.length + 3;
    validationStage = "complete";
    logAccounting("success");

    return {
      printRequestId: payload.printRequestId,
      upcomingShowId: payload.upcomingShowId,
      allocationIds,
      totalAllocatedQuantity: allocatedTotal,
      isFullyQueued: true,
      remainingUnallocatedQuantity: 0,
    };
  } catch (error) {
    logAccounting(
      "failure",
      error instanceof Error && "code" in error
        ? String((error as { code?: unknown }).code ?? "queue-failed")
        : "queue-failed",
    );
    // Surface the sanitized validation stage to the client so Portal's debug report never shows
    // failureStage: null again (owner live-test evidence, 2026-07-25). Stage names are generic
    // pipeline labels — no customer/request/show data.
    if (error instanceof Error && "code" in error) {
      const carrier = error as { details?: unknown };
      const existingDetails =
        carrier.details && typeof carrier.details === "object"
          ? (carrier.details as Record<string, unknown>)
          : {};
      carrier.details = { ...existingDetails, failureStage: validationStage };
    }
    mapHttpsError(error);
  }
});
