import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

import type { CreatePortalPrintRequestResponse } from "../../packages/shared/src/types/printRequest/createPortalPrintRequest.types";
import { formatCustomerPrintRequestName } from "../../packages/shared/src/utils/printRequestNaming";
import { requireValidCustomerUsername } from "../../packages/shared/src/utils/customerUsername";
import { adminDb } from "./lib/admin";
import { internal, invalidArgument, permissionDenied, unauthenticated } from "./lib/errors";
import { validateCreatePortalPrintRequestRequest } from "./lib/createPortalPrintRequestValidation";

function resolveNextSequence(value: unknown): number {
  if (typeof value === "number" && Number.isInteger(value) && value >= 1) {
    return value;
  }

  return 1;
}

function mapHttpsError(error: unknown): never {
  if (error instanceof HttpsError) {
    throw error;
  }

  if (error instanceof Error) {
    throw invalidArgument(error.message);
  }

  throw internal("Unable to create print request right now.");
}

async function findCustomerByUserId(userId: string) {
  const snapshot = await adminDb.collection("customers").where("userId", "==", userId).limit(1).get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  return { id: doc.id, data: doc.data() };
}

export const createPortalPrintRequest = onCall(async (request): Promise<CreatePortalPrintRequestResponse> => {
  if (!request.auth?.uid) {
    throw unauthenticated();
  }

  const userId = request.auth.uid;

  try {
    const userSnapshot = await adminDb.collection("users").doc(userId).get();
    const role = userSnapshot.data()?.role;

    if (!userSnapshot.exists || role !== "customer") {
      throw permissionDenied("Only portal customers can create print requests.");
    }

    const customer = await findCustomerByUserId(userId);

    if (!customer) {
      throw permissionDenied("No customer profile is linked to this account.");
    }

    const payload = validateCreatePortalPrintRequestRequest(request.data);
    const username = requireValidCustomerUsername(
      typeof customer.data.username === "string" ? customer.data.username : "",
    );
    const displayName =
      typeof customer.data.displayName === "string" ? customer.data.displayName : "Customer";

    const customerRef = adminDb.collection("customers").doc(customer.id);
    const requestRef = adminDb.collection("printRequests").doc();
    const timestamp = FieldValue.serverTimestamp();
    let createdName = "";

    await adminDb.runTransaction(async (transaction) => {
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

      createdName = formatCustomerPrintRequestName(username, nextSequence);

      transaction.set(requestRef, {
        name: createdName,
        customerId: customer.id,
        isInternal: false,
        requestOrigin: "portal_customer",
        status: "draft",
        itemCount: 0,
        requestSequenceNumber: nextSequence,
        customerUsernameSnapshot: username,
        customerDisplayNameSnapshot: displayName,
        nameFormatVersion: "cr-ir-v1",
        ...(payload.notes ? { notes: payload.notes } : {}),
        createdBy: userId,
        updatedBy: userId,
        createdAt: timestamp,
        updatedAt: timestamp,
      });

      transaction.update(customerRef, {
        nextPrintRequestSequence: nextSequence + 1,
        totalPrintRequests: nextTotal + 1,
        updatedAt: timestamp,
      });
    });

    return {
      printRequestId: requestRef.id,
      name: createdName,
      customerId: customer.id,
    };
  } catch (error) {
    mapHttpsError(error);
  }
});
