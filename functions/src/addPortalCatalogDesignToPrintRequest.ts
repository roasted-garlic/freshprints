import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

import type {
  AddPortalCatalogDesignToPrintRequestRequest,
  AddPortalCatalogDesignToPrintRequestResponse,
} from "../../packages/shared/src/types/printRequest/addPortalCatalogDesignToPrintRequest.types";
import { resolveCatalogAddAction } from "../../packages/shared/src/utils/currentRequestAggregates";
import {
  formatPrintRequestItemSizeLabel,
  resolveInitialPrintRequestItemSize,
  resolvePrintRequestDefaultWidthInches,
} from "../../packages/shared/src/utils/printRequestItemSizing";

import { adminDb } from "./lib/admin";
import {
  failedPrecondition,
  internal,
  invalidArgument,
  permissionDenied,
  unauthenticated,
} from "./lib/errors";
import { withoutUndefinedFields } from "./lib/firestoreDocument";
import { loadEffectivePrintRequestLimitsForCustomer } from "./lib/loadEffectivePrintRequestLimits";
import { loadStandardPrintSizesSettings } from "./lib/loadStandardPrintSizesSettings";
import { requirePortalCustomer } from "./lib/portalCustomer";
import {
  assertWorkingRequestAllowsPrintAdds,
  sumWorkingRequestPrintQuantities,
} from "./lib/printRequestWorkingRequestMax";
import { assertPortalActiveEditableRequestData } from "./lib/portalContinuableParking";

function mapHttpsError(error: unknown): never {
  if (error instanceof HttpsError) {
    throw error;
  }
  if (error instanceof Error) {
    throw invalidArgument(error.message);
  }
  throw internal("Unable to add this design to your print request right now.");
}

function createdAtMillis(value: unknown): number {
  if (
    value &&
    typeof value === "object" &&
    "toMillis" in value &&
    typeof (value as { toMillis?: unknown }).toMillis === "function"
  ) {
    return (value as { toMillis: () => number }).toMillis();
  }
  return 0;
}

function resolveNextSortOrder(
  items: Array<{ sortOrder?: number }>,
): number {
  let max = 0;
  for (const item of items) {
    if (typeof item.sortOrder === "number" && Number.isFinite(item.sortOrder)) {
      max = Math.max(max, item.sortOrder);
    }
  }
  return max + 1;
}

/** Server-authoritative initial size for a new Portal catalog line (callable create path). */
export function resolvePortalCatalogAddLineSize(input: {
  pixelWidth: number;
  pixelHeight: number;
  designPrintWidthInches?: number;
  requestedPrintWidthInches?: number;
  requestedPrintHeightInches?: number;
  printRequestDefaultWidthInches?: number;
}): { printWidthInches: number; printHeightInches: number } {
  const defaultSize = resolveInitialPrintRequestItemSize({
    pixelWidth: input.pixelWidth,
    pixelHeight: input.pixelHeight,
    defaultPrintWidthInches: input.designPrintWidthInches,
    printRequestDefaultWidthInches: input.printRequestDefaultWidthInches,
  });

  return {
    printWidthInches: input.requestedPrintWidthInches ?? defaultSize.printWidthInches,
    printHeightInches: input.requestedPrintHeightInches ?? defaultSize.printHeightInches,
  };
}

export function buildPortalCatalogAddAccounting(
  kind: "created" | "incremented",
  metrics: {
    transactionAttempts: number;
    transactionDocumentsReturned: number;
    durationMs: number;
    outcome: "success" | "failure";
  },
) {
  const itemWrites = 1;
  const parentRequestWrites = 1;
  const designAnalyticsWrites = kind === "created" ? 1 : 0;
  return {
    itemWrites,
    parentRequestWrites,
    designAnalyticsWrites,
    idempotencyWrites: 0,
    otherWrites: 0,
    totalWrites: itemWrites + parentRequestWrites + designAnalyticsWrites,
    itemOutcome: kind,
    readOperations: 4 + (metrics.transactionAttempts * 2),
    documentsReturned: 4 + metrics.transactionDocumentsReturned,
    transactionAttempts: metrics.transactionAttempts,
    batchSize: 0,
    deletes: 0,
    duplicateSkip: false,
    durationMs: metrics.durationMs,
    outcome: metrics.outcome,
  };
}

export const addPortalCatalogDesignToPrintRequest = onCall(
  async (request): Promise<AddPortalCatalogDesignToPrintRequestResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    const startedAtMs = Date.now();
    let transactionAttempts = 0;
    let transactionDocumentsReturned = 0;
    let accountingKind: "created" | "incremented" = "created";
    try {
      const portalCustomer = await requirePortalCustomer(request.auth.uid);
      const data = request.data as AddPortalCatalogDesignToPrintRequestRequest;
      const printRequestId =
        typeof data?.printRequestId === "string" ? data.printRequestId.trim() : "";
      const designId = typeof data?.designId === "string" ? data.designId.trim() : "";
      const rawDelta = data?.quantityDelta;
      const quantityDelta =
        rawDelta === undefined || rawDelta === null ? 1 : Math.floor(Number(rawDelta));
      const forceNewLine = data?.forceNewLine === true;
      const requestedWidth =
        typeof data?.printWidthInches === "number" && Number.isFinite(data.printWidthInches)
          ? data.printWidthInches
          : undefined;
      const requestedHeight =
        typeof data?.printHeightInches === "number" && Number.isFinite(data.printHeightInches)
          ? data.printHeightInches
          : undefined;
      const requestedSortOrder =
        typeof data?.sortOrder === "number" && Number.isFinite(data.sortOrder)
          ? Math.floor(data.sortOrder)
          : undefined;

      if (!printRequestId || !designId) {
        throw invalidArgument("printRequestId and designId are required.");
      }
      if (!Number.isFinite(quantityDelta) || quantityDelta < 1) {
        throw invalidArgument("Quantity must be at least 1.");
      }

      const [effectiveLimits, standardPrintSizesSettings, designSnap] = await Promise.all([
        loadEffectivePrintRequestLimitsForCustomer(portalCustomer.customerId),
        loadStandardPrintSizesSettings(),
        adminDb.collection("designs").doc(designId).get(),
      ]);
      const printRequestDefaultWidthInches = resolvePrintRequestDefaultWidthInches(
        standardPrintSizesSettings,
      );

      if (!designSnap.exists) {
        throw invalidArgument("Design not found.");
      }
      const design = designSnap.data() ?? {};
      if (design.status !== "ready") {
        throw failedPrecondition("This design is not available to add.");
      }

      const customerUid = request.auth.uid;
      const maxPerRequest = effectiveLimits.effectiveMaxQuantityPerPrintRequest;
      let kind: "created" | "incremented" = "created";
      let itemId = "";
      let quantity = quantityDelta;
      let responseItem!: AddPortalCatalogDesignToPrintRequestResponse["item"];

      await adminDb.runTransaction(async (tx) => {
        transactionAttempts += 1;
        const requestRef = adminDb.collection("printRequests").doc(printRequestId);
        const itemsQuery = adminDb
          .collection("printRequestItems")
          .where("printRequestId", "==", printRequestId);

        const [requestSnap, itemsSnap] = await Promise.all([
          tx.get(requestRef),
          tx.get(itemsQuery),
        ]);
        transactionDocumentsReturned += (requestSnap.exists ? 1 : 0) + itemsSnap.size;

        if (!requestSnap.exists) {
          throw invalidArgument("Print request not found.");
        }
        const requestData = requestSnap.data() ?? {};
        
        // Assert request is active editable (not parked)
        assertPortalActiveEditableRequestData(requestData, requestRef.id);
        
        if (requestData.customerId !== portalCustomer.customerId) {
          throw permissionDenied("You do not own this print request.");
        }
        if (requestData.requestOrigin !== "portal_customer" || requestData.isInternal === true) {
          throw failedPrecondition("This request cannot be edited from the portal.");
        }
        const status = requestData.status;
        if (status !== "draft" && status !== "editing") {
          throw failedPrecondition("This print request can no longer be edited.");
        }

        const itemLikes = itemsSnap.docs.map((docSnap) => {
          const itemData = docSnap.data() ?? {};
          return {
            id: docSnap.id,
            designId: typeof itemData.designId === "string" ? itemData.designId : undefined,
            customerUploadId:
              typeof itemData.customerUploadId === "string"
                ? itemData.customerUploadId
                : undefined,
            sourceType:
              itemData.sourceType === "customer_upload" ? ("customer_upload" as const) : undefined,
            quantity: typeof itemData.quantity === "number" ? itemData.quantity : 1,
            createdAtMs: createdAtMillis(itemData.createdAt),
            sortOrder: typeof itemData.sortOrder === "number" ? itemData.sortOrder : undefined,
            printWidthInches: typeof itemData.printWidthInches === "number" ? itemData.printWidthInches : undefined,
            printHeightInches: typeof itemData.printHeightInches === "number" ? itemData.printHeightInches : undefined,
            sizeLabel: typeof itemData.sizeLabel === "string" ? itemData.sizeLabel : undefined,
            addedBy: typeof itemData.addedBy === "string" ? itemData.addedBy : customerUid,
          };
        });

        const action = forceNewLine
          ? ({ kind: "create" } as const)
          : resolveCatalogAddAction(itemLikes, designId);
        const now = FieldValue.serverTimestamp();
        const currentPrintCount = sumWorkingRequestPrintQuantities(itemLikes);
        assertWorkingRequestAllowsPrintAdds({
          currentPrintCount,
          addCount: quantityDelta,
          maxPerRequest,
        });

        if (action.kind === "increment") {
          const nextQuantity = action.nextQuantity + (quantityDelta - 1);
          const itemRef = adminDb.collection("printRequestItems").doc(action.itemId);
          tx.update(itemRef, {
            quantity: nextQuantity,
            updatedAt: now,
          });
          tx.update(requestRef, {
            updatedAt: now,
            updatedBy: customerUid,
          });
          kind = "incremented";
          itemId = action.itemId;
          quantity = nextQuantity;
          const currentItem = itemLikes.find((item) => item.id === action.itemId)!;
          responseItem = {
            id: action.itemId,
            printRequestId,
            designId,
            quantity: nextQuantity,
            printWidthInches: currentItem.printWidthInches,
            printHeightInches: currentItem.printHeightInches,
            sizeLabel: currentItem.sizeLabel,
            sortOrder: currentItem.sortOrder,
            status: "pending",
            addedBy: currentItem.addedBy,
            createdAtMs: currentItem.createdAtMs,
            updatedAtMs: Date.now(),
          };
          return;
        }

        if (typeof design.width !== "number" || typeof design.height !== "number") {
          throw failedPrecondition("This design is missing dimensions.");
        }

        const { printWidthInches, printHeightInches } = resolvePortalCatalogAddLineSize({
          pixelWidth: design.width,
          pixelHeight: design.height,
          designPrintWidthInches:
            typeof design.printWidthInches === "number" ? design.printWidthInches : undefined,
          requestedPrintWidthInches: requestedWidth,
          requestedPrintHeightInches: requestedHeight,
          printRequestDefaultWidthInches,
        });
        const newItemRef = adminDb.collection("printRequestItems").doc();
        const currentItemCount = Number(requestData.itemCount ?? 0);

        tx.set(
          newItemRef,
          withoutUndefinedFields({
            id: newItemRef.id,
            printRequestId,
            designId,
            sourceType: "catalog_design",
            quantity: quantityDelta,
            printWidthInches,
            printHeightInches,
            sizeLabel: formatPrintRequestItemSizeLabel(printWidthInches, printHeightInches),
            sortOrder: requestedSortOrder ?? resolveNextSortOrder(itemLikes),
            status: "pending",
            addedBy: customerUid,
            createdAt: now,
            updatedAt: now,
          }),
        );
        tx.update(requestRef, {
          itemCount: currentItemCount + 1,
          updatedAt: now,
          updatedBy: customerUid,
        });

        kind = "created";
        itemId = newItemRef.id;
        quantity = quantityDelta;
        responseItem = {
          id: newItemRef.id,
          printRequestId,
          designId,
          quantity: quantityDelta,
          printWidthInches,
          printHeightInches,
          sizeLabel: formatPrintRequestItemSizeLabel(printWidthInches, printHeightInches),
          sortOrder: requestedSortOrder ?? resolveNextSortOrder(itemLikes),
          status: "pending",
          addedBy: customerUid,
          createdAtMs: Date.now(),
          updatedAtMs: Date.now(),
        };
      });
      accountingKind = kind;

      if (process.env.GCLOUD_PROJECT === "fresh-prints-dev") {
        console.info(
          "portal-catalog-add-accounting",
          buildPortalCatalogAddAccounting(kind, {
            transactionAttempts,
            transactionDocumentsReturned,
            durationMs: Date.now() - startedAtMs,
            outcome: "success",
          }),
        );
      }

      return {
        kind,
        itemId,
        printRequestId,
        designId,
        quantity,
        item: responseItem,
      };
    } catch (error) {
      if (process.env.GCLOUD_PROJECT === "fresh-prints-dev") {
        console.info("portal-catalog-add-accounting", {
          ...buildPortalCatalogAddAccounting(accountingKind, {
            transactionAttempts,
            transactionDocumentsReturned,
            durationMs: Date.now() - startedAtMs,
            outcome: "failure",
          }),
          itemWrites: 0,
          parentRequestWrites: 0,
          designAnalyticsWrites: 0,
          totalWrites: 0,
          failureCode: "add-failed",
        });
      }
      mapHttpsError(error);
    }
  },
);
