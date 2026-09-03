import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

import {
  formatInternalPrintRequestName,
  requireValidInternalBaseName,
} from "../../packages/shared/src/utils/printRequestNaming";
import { evaluateCustomerPrintRequestConversionEligibility } from "../../packages/shared/src/utils/printRequestConversion";

import { loadCallerProfile, assertStaffCaller } from "./lib/caller";
import { adminDb } from "./lib/admin";
import {
  failedPrecondition,
  internal,
  invalidArgument,
  unauthenticated,
} from "./lib/errors";
import {
  applyRestoreParkedDraftWritesInTransaction,
  readParkedDraftForRestoreInTransaction,
} from "./lib/portalContinuableParking";

const INTERNAL_PRINT_REQUEST_COUNTER_ID = "printRequests";

import type { ConvertCustomerPrintRequestToInternalResponse } from "../../packages/shared/src/types/printRequest/convertCustomerPrintRequestToInternal.types";

function mapHttpsError(error: unknown): never {
  if (error instanceof HttpsError) {
    throw error;
  }
  if (error instanceof Error) {
    throw internal(error.message);
  }
  throw internal("Unable to convert this print request right now.");
}

function resolveNextSequence(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 ? value : 1;
}

export const convertCustomerPrintRequestToInternal = onCall(
  async (request): Promise<ConvertCustomerPrintRequestToInternalResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    try {
      const caller = await loadCallerProfile(request.auth.uid);
      assertStaffCaller(caller);

      const printRequestId =
        typeof request.data?.printRequestId === "string" ? request.data.printRequestId.trim() : "";
      if (!printRequestId) {
        throw invalidArgument("A print request ID is required.");
      }

      const internalBaseNameInput =
        typeof request.data?.internalBaseName === "string" ? request.data.internalBaseName : "";
      const confirmCancelAllocations = request.data?.confirmCancelAllocations === true;

      const customerRequestRef = adminDb.collection("printRequests").doc(printRequestId);
      const customerRequestSnap = await customerRequestRef.get();
      if (!customerRequestSnap.exists) {
        throw invalidArgument("Print request not found.");
      }

      const customerRequest = customerRequestSnap.data() ?? {};

      if (
        customerRequest.closureKind === "converted_to_internal" &&
        typeof customerRequest.convertedToInternalRequestId === "string"
      ) {
        if (customerRequest.queueTab !== undefined) {
          await customerRequestRef.update({
            queueTab: FieldValue.delete(),
            updatedAt: FieldValue.serverTimestamp(),
          });
        }

        const existingInternal = await adminDb
          .collection("printRequests")
          .doc(customerRequest.convertedToInternalRequestId)
          .get();
        return {
          customerRequestId: printRequestId,
          internalRequestId: customerRequest.convertedToInternalRequestId,
          internalRequestName:
            typeof existingInternal.data()?.name === "string"
              ? existingInternal.data()!.name
              : "",
          canceledAllocationIds: [],
          alreadyConverted: true,
        };
      }

      const [itemsSnap, allocationsSnap] = await Promise.all([
        adminDb.collection("printRequestItems").where("printRequestId", "==", printRequestId).get(),
        adminDb.collection("showAllocations").where("printRequestId", "==", printRequestId).get(),
      ]);

      const allocationSummaries = allocationsSnap.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          upcomingShowId: typeof data.upcomingShowId === "string" ? data.upcomingShowId : "",
          status: typeof data.status === "string" ? data.status : "canceled",
          allocatedQuantity:
            typeof data.allocatedQuantity === "number" ? data.allocatedQuantity : 0,
          requestNameSnapshot:
            typeof data.requestNameSnapshot === "string" ? data.requestNameSnapshot : undefined,
        };
      });

      const showIds = [...new Set(allocationSummaries.map((entry) => entry.upcomingShowId).filter(Boolean))];
      let linkedShowsPrinting = false;
      if (showIds.length > 0) {
        const showSnaps = await Promise.all(
          showIds.map((showId) => adminDb.collection("upcomingShows").doc(showId).get()),
        );
        linkedShowsPrinting = showSnaps.some(
          (showSnap) => showSnap.exists && showSnap.data()?.productionStatus === "printing",
        );
      }

      const eligibility = evaluateCustomerPrintRequestConversionEligibility({
        isInternal: customerRequest.isInternal === true,
        requestOrigin:
          typeof customerRequest.requestOrigin === "string" ? customerRequest.requestOrigin : undefined,
        closureKind:
          customerRequest.closureKind === "converted_to_internal"
            ? ("converted_to_internal" as const)
            : undefined,
        status: typeof customerRequest.status === "string" ? customerRequest.status : "draft",
        allocations: allocationSummaries as never[],
        linkedShowsPrinting,
      });

      if (!eligibility.eligible) {
        throw failedPrecondition(eligibility.reason ?? "This request cannot be converted.");
      }

      if (eligibility.cancelableAllocations.length > 0 && !confirmCancelAllocations) {
        throw failedPrecondition(
          "Confirm cancellation of pending show allocations before converting this request.",
        );
      }

      const internalBaseName = requireValidInternalBaseName(
        internalBaseNameInput ||
          (typeof customerRequest.customerUsernameSnapshot === "string"
            ? customerRequest.customerUsernameSnapshot
            : "internal"),
      );

      const counterRef = adminDb.collection("counters").doc(INTERNAL_PRINT_REQUEST_COUNTER_ID);
      const internalRequestRef = adminDb.collection("printRequests").doc();
      const timestamp = FieldValue.serverTimestamp();
      const canceledAllocationIds: string[] = [];

      await adminDb.runTransaction(async (transaction) => {
        const [counterSnap, latestCustomerSnap] = await Promise.all([
          transaction.get(counterRef),
          transaction.get(customerRequestRef),
        ]);

        if (!latestCustomerSnap.exists) {
          throw invalidArgument("Print request not found.");
        }

        const latestCustomer = latestCustomerSnap.data() ?? {};
        if (latestCustomer.closureKind === "converted_to_internal") {
          return;
        }

        const parksDraftPrintRequestId =
          typeof latestCustomer.parksDraftPrintRequestId === "string"
            ? latestCustomer.parksDraftPrintRequestId
            : undefined;
        const parkedRestoreRead = await readParkedDraftForRestoreInTransaction(
          transaction,
          customerRequestRef,
          parksDraftPrintRequestId,
        );

        const sequence = resolveNextSequence(counterSnap.data()?.nextInternalRequestSequence);
        const internalName = formatInternalPrintRequestName(internalBaseName, sequence);

        transaction.set(internalRequestRef, {
          name: internalName,
          isInternal: true,
          requestOrigin: "studio_internal",
          internalBaseName,
          nameFormatVersion: "cr-ir-v1",
          requestSequenceNumber: sequence,
          status: "active",
          itemCount: itemsSnap.size,
          convertedFromCustomerRequestId: printRequestId,
          notes: typeof latestCustomer.notes === "string" ? latestCustomer.notes : "",
          createdBy: caller.id,
          updatedBy: caller.id,
          createdAt: timestamp,
          updatedAt: timestamp,
        });

        transaction.set(
          counterRef,
          {
            nextInternalRequestSequence: sequence + 1,
            updatedAt: timestamp,
            ...(counterSnap.exists ? {} : { createdAt: timestamp }),
          },
          { merge: true },
        );

        for (const itemDoc of itemsSnap.docs) {
          const item = itemDoc.data();
          const newItemRef = adminDb.collection("printRequestItems").doc();
          const sourceType =
            typeof item.sourceType === "string" ? item.sourceType : "catalog_design";
          const payload: Record<string, unknown> = {
            printRequestId: internalRequestRef.id,
            sourceType,
            quantity: typeof item.quantity === "number" ? item.quantity : 1,
            status: "pending",
            addedBy: caller.id,
            createdAt: timestamp,
            updatedAt: timestamp,
          };

          if (sourceType === "customer_upload") {
            payload.customerUploadId = item.customerUploadId;
            payload.titleSnapshot = item.titleSnapshot;
          } else {
            payload.designId = item.designId;
          }

          if (typeof item.printWidthInches === "number") {
            payload.printWidthInches = item.printWidthInches;
          }
          if (typeof item.printHeightInches === "number") {
            payload.printHeightInches = item.printHeightInches;
          }
          if (typeof item.sizeLabel === "string") {
            payload.sizeLabel = item.sizeLabel;
          }
          if (typeof item.sortOrder === "number") {
            payload.sortOrder = item.sortOrder;
          }
          if (typeof item.notes === "string") {
            payload.notes = item.notes;
          }

          transaction.set(newItemRef, payload);
        }

        for (const allocation of eligibility.cancelableAllocations) {
          const allocationRef = adminDb.collection("showAllocations").doc(allocation.id);
          transaction.update(allocationRef, {
            status: "canceled",
            updatedBy: caller.id,
            updatedAt: timestamp,
          });
          canceledAllocationIds.push(allocation.id);
        }

        // Restore parked draft if this request was editing with a parked draft (writes only).
        applyRestoreParkedDraftWritesInTransaction(transaction, {
          editingRequestRef: customerRequestRef,
          restoreRead: parkedRestoreRead,
          actorId: caller.id,
          clearEditingParkingFields: false,
        });

        transaction.update(customerRequestRef, {
          status: "archived",
          closureKind: "converted_to_internal",
          convertedToInternalRequestId: internalRequestRef.id,
          convertedAt: timestamp,
          convertedBy: caller.id,
          parksDraftPrintRequestId: FieldValue.delete(),
          updatedBy: caller.id,
          updatedAt: timestamp,
          queueTab: FieldValue.delete(),
        });
      });

      const internalSnap = await internalRequestRef.get();

      return {
        customerRequestId: printRequestId,
        internalRequestId: internalRequestRef.id,
        internalRequestName: typeof internalSnap.data()?.name === "string" ? internalSnap.data()!.name : "",
        canceledAllocationIds,
        alreadyConverted: false,
      };
    } catch (error) {
      mapHttpsError(error);
    }
  },
);
