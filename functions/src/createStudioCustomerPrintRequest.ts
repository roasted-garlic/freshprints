import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

import type {
  CreateStudioCustomerPrintRequestRequest,
  CreateStudioCustomerPrintRequestResponse,
} from "../../packages/shared/src/types/printRequest/createStudioCustomerPrintRequest.types";
import { isPortalParkedDraft } from "../../packages/shared/src/utils/portalActiveEditablePrintRequest";
import { formatCustomerPrintRequestName } from "../../packages/shared/src/utils/printRequestNaming";
import { requireValidCustomerUsername } from "../../packages/shared/src/utils/customerUsername";

import { adminDb } from "./lib/admin";
import { assertStaffCaller, loadCallerProfile } from "./lib/caller";
import { failedPrecondition, internal, invalidArgument, unauthenticated } from "./lib/errors";

const ONE_WORKING_REQUEST_MESSAGE =
  "This customer already has an active working print request. Finish or release that request before creating another.";

function mapError(error: unknown): never {
  if (error instanceof HttpsError) {
    throw error;
  }
  if (error instanceof Error) {
    throw internal(error.message);
  }
  throw internal("Unable to create the customer print request right now.");
}

function parseRequest(data: unknown): CreateStudioCustomerPrintRequestRequest {
  if (!data || typeof data !== "object") {
    throw invalidArgument("A customer is required.");
  }

  const input = data as Partial<CreateStudioCustomerPrintRequestRequest>;
  const customerId = typeof input.customerId === "string" ? input.customerId.trim() : "";
  if (!customerId) {
    throw invalidArgument("A customer is required.");
  }

  const notes = input.notes === undefined ? undefined : typeof input.notes === "string" ? input.notes.trim() : null;
  if (notes === null) {
    throw invalidArgument("Notes must be text.");
  }
  if (notes && notes.length > 2000) {
    throw invalidArgument("Notes must be 2000 characters or fewer.");
  }

  return { customerId, ...(notes ? { notes } : {}) };
}

export const createStudioCustomerPrintRequest = onCall(
  async (request): Promise<CreateStudioCustomerPrintRequestResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    try {
      const caller = await loadCallerProfile(request.auth.uid);
      assertStaffCaller(caller);
      const input = parseRequest(request.data);

      return await adminDb.runTransaction(async (transaction) => {
        const customerRef = adminDb.collection("customers").doc(input.customerId);
        const requestQuery = adminDb
          .collection("printRequests")
          .where("customerId", "==", input.customerId)
          .where("status", "in", ["draft", "editing"])
          .limit(10);

        const [customerSnap, continuableSnap] = await Promise.all([
          transaction.get(customerRef),
          transaction.get(requestQuery),
        ]);

        if (!customerSnap.exists) {
          throw invalidArgument("Customer not found.");
        }

        const customer = customerSnap.data() ?? {};
        if (
          customer.isGuest === true ||
          customer.isDeleted === true ||
          customer.isDisabled === true ||
          customer.isMerged === true
        ) {
          throw invalidArgument("Choose an active, non-guest customer.");
        }

        const username = typeof customer.username === "string" ? customer.username.trim() : "";
        let validUsername: string;
        try {
          validUsername = requireValidCustomerUsername(username);
        } catch {
          throw invalidArgument("The selected customer needs a valid username before receiving a print request.");
        }

        const hasActiveContinuable = continuableSnap.docs.some((doc) => {
          const data = doc.data();
          if (data.isInternal === true) {
            return false;
          }
          return !isPortalParkedDraft({
            status: data.status === "editing" ? "editing" : "draft",
            parkedByEditingRequestId:
              typeof data.parkedByEditingRequestId === "string" ? data.parkedByEditingRequestId : undefined,
          });
        });

        if (hasActiveContinuable) {
          throw failedPrecondition(ONE_WORKING_REQUEST_MESSAGE);
        }

        const nextSequence =
          typeof customer.nextPrintRequestSequence === "number" &&
          Number.isInteger(customer.nextPrintRequestSequence) &&
          customer.nextPrintRequestSequence >= 1
            ? customer.nextPrintRequestSequence
            : 1;
        const totalPrintRequests =
          typeof customer.totalPrintRequests === "number" && customer.totalPrintRequests >= 0
            ? customer.totalPrintRequests
            : 0;
        const requestRef = adminDb.collection("printRequests").doc();
        const timestamp = FieldValue.serverTimestamp();

        transaction.set(requestRef, {
          name: formatCustomerPrintRequestName(validUsername, nextSequence),
          customerId: input.customerId,
          isInternal: false,
          requestOrigin: "studio_customer",
          status: "draft",
          itemCount: 0,
          queueTab: "working",
          requestSequenceNumber: nextSequence,
          customerUsernameSnapshot: validUsername,
          customerDisplayNameSnapshot:
            typeof customer.displayName === "string" ? customer.displayName : "Customer",
          nameFormatVersion: "cr-ir-v1",
          ...(input.notes ? { notes: input.notes } : {}),
          createdBy: caller.id,
          updatedBy: caller.id,
          createdAt: timestamp,
          updatedAt: timestamp,
        });
        transaction.update(customerRef, {
          nextPrintRequestSequence: nextSequence + 1,
          totalPrintRequests: totalPrintRequests + 1,
          updatedAt: timestamp,
        });

        return { printRequestId: requestRef.id };
      });
    } catch (error) {
      mapError(error);
    }
  },
);
