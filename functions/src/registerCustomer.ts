import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

import type { RegisterCustomerResponse } from "../../packages/shared/src/types/auth/registerCustomer.types";
import { adminDb } from "./lib/admin";
import { alreadyExists, internal, invalidArgument, permissionDenied, unauthenticated } from "./lib/errors";
import { validateRegisterCustomerRequest } from "./lib/registerCustomerValidation";

const staffRoles = new Set(["owner", "admin", "helper"]);

function mapHttpsError(error: unknown): never {
  if (error instanceof HttpsError) {
    throw error;
  }

  if (error instanceof Error) {
    throw invalidArgument(error.message);
  }

  throw internal("Unable to complete customer registration right now.");
}

async function findCustomerIdByUserId(userId: string): Promise<string | null> {
  const snapshot = await adminDb.collection("customers").where("userId", "==", userId).limit(1).get();

  if (snapshot.empty) {
    return null;
  }

  return snapshot.docs[0]?.id ?? null;
}

async function assertEmailAvailableForCustomerRegistration(email: string, userId: string): Promise<void> {
  const [usersSnapshot, customersSnapshot] = await Promise.all([
    adminDb.collection("users").where("email", "==", email).limit(2).get(),
    adminDb.collection("customers").where("email", "==", email).limit(2).get(),
  ]);

  const emailUsedByAnotherUser = usersSnapshot.docs.some((userDoc) => userDoc.id !== userId);
  const emailUsedByAnotherCustomer = customersSnapshot.docs.some((customerDoc) => {
    const linkedUserId = customerDoc.data().userId;
    return typeof linkedUserId !== "string" || linkedUserId !== userId;
  });

  if (emailUsedByAnotherUser || emailUsedByAnotherCustomer) {
    throw alreadyExists("That email is already used by another account.");
  }
}

export const registerCustomer = onCall(async (request): Promise<RegisterCustomerResponse> => {
  if (!request.auth?.uid) {
    throw unauthenticated();
  }

  const userId = request.auth.uid;
  const userRef = adminDb.collection("users").doc(userId);

  try {
    const userSnapshot = await userRef.get();

    if (userSnapshot.exists) {
      const role = userSnapshot.data()?.role;

      if (typeof role === "string" && staffRoles.has(role)) {
        throw permissionDenied("Staff accounts cannot register as portal customers.");
      }

      if (role === "customer") {
        const existingCustomerId = await findCustomerIdByUserId(userId);

        if (existingCustomerId) {
          const customerSnapshot = await adminDb.collection("customers").doc(existingCustomerId).get();
          const customerData = customerSnapshot.data();
          const email =
            typeof request.auth.token.email === "string"
              ? request.auth.token.email.trim().toLowerCase()
              : "";

          return {
            userId,
            customerId: existingCustomerId,
            email,
            displayName:
              typeof customerData?.displayName === "string"
                ? customerData.displayName
                : typeof userSnapshot.data()?.displayName === "string"
                  ? userSnapshot.data()!.displayName
                  : "Customer",
            username: typeof customerData?.username === "string" ? customerData.username : "",
            alreadyProvisioned: true,
          };
        }
      }
    }

    const payload = validateRegisterCustomerRequest(request.data, request.auth.token.email);

    await assertEmailAvailableForCustomerRegistration(payload.email, userId);

    const customerRef = adminDb.collection("customers").doc();
    const usernameReservationRef = adminDb.collection("customerUsernames").doc(payload.username);
    const timestamp = FieldValue.serverTimestamp();

    await adminDb.runTransaction(async (transaction) => {
      const reservationSnapshot = await transaction.get(usernameReservationRef);

      if (reservationSnapshot.exists && reservationSnapshot.data()?.customerId !== customerRef.id) {
        throw alreadyExists("That customer username is already taken.");
      }

      transaction.set(
        userRef,
        {
          id: userId,
          email: payload.email,
          displayName: payload.displayName,
          role: "customer",
          isActive: true,
          signupSource: "portal",
          createdAt: userSnapshot.exists ? userSnapshot.data()?.createdAt ?? timestamp : timestamp,
          updatedAt: timestamp,
          createdBy: userSnapshot.exists ? userSnapshot.data()?.createdBy ?? userId : userId,
        },
        { merge: true },
      );

      transaction.set(customerRef, {
        id: customerRef.id,
        userId,
        displayName: payload.displayName,
        username: payload.username,
        email: payload.email,
        isGuest: false,
        signupSource: "portal",
        totalPrintRequests: 0,
        nextPrintRequestSequence: 1,
        usernameUpdatedAt: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
      });

      transaction.set(usernameReservationRef, {
        customerId: customerRef.id,
        createdAt: reservationSnapshot.exists ? reservationSnapshot.data()?.createdAt ?? timestamp : timestamp,
        updatedAt: timestamp,
      });
    });

    return {
      userId,
      customerId: customerRef.id,
      email: payload.email,
      displayName: payload.displayName,
      username: payload.username,
      alreadyProvisioned: false,
    };
  } catch (error) {
    mapHttpsError(error);
  }
});
