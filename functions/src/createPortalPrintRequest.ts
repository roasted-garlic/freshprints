import { HttpsError, onCall } from "firebase-functions/v2/https";

import type { CreatePortalPrintRequestResponse } from "../../packages/shared/src/types/printRequest/createPortalPrintRequest.types";
import { adminDb } from "./lib/admin";
import {
  internal,
  invalidArgument,
  permissionDenied,
  unauthenticated,
} from "./lib/errors";
import { validateCreatePortalPrintRequestRequest } from "./lib/createPortalPrintRequestValidation";
import { createWorkingPrintRequestInTransaction } from "./lib/portalWorkingPrintRequest";

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

  const docSnap = snapshot.docs[0];
  return { id: docSnap.id, data: docSnap.data() };
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
    const displayName =
      typeof customer.data.displayName === "string" ? customer.data.displayName : "Customer";
    const username = typeof customer.data.username === "string" ? customer.data.username : "";

    let printRequestId = "";
    let createdName = "";

    await adminDb.runTransaction(async (transaction) => {
      const created = await createWorkingPrintRequestInTransaction(
        transaction,
        {
          customerId: customer.id,
          userId,
          username,
          displayName,
        },
        payload.notes,
      );
      printRequestId = created.printRequestId;
      createdName = created.name;
    });

    return {
      printRequestId,
      name: createdName,
      customerId: customer.id,
    };
  } catch (error) {
    mapHttpsError(error);
  }
});
