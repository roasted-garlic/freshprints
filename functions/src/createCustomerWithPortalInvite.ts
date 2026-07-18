import { randomBytes } from "node:crypto";

import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

import type { CreateCustomerWithPortalInviteResponse } from "../../packages/shared/src/types/customer/createCustomerWithPortalInvite.types";
import { adminAuth, adminDb } from "./lib/admin";
import { loadCallerProfile } from "./lib/caller";
import { validateCreateCustomerWithPortalInviteRequest } from "./lib/customerPortalInviteValidation";
import { alreadyExists, internal, invalidArgument, unauthenticated } from "./lib/errors";
import { withoutUndefinedFields } from "./lib/firestoreDocument";
import { assertCanManageCustomers } from "./lib/permissions";
import { sendCustomerPortalInvitationEmail } from "./lib/resendEmailService";
import { brevoApiKeySecret, invitationFromEmail, resendApiKeySecret } from "./lib/secrets";
import { loadEmailProviderSettings } from "./lib/email/emailSettings";
import { resolvePortalLoginContinueUrl } from "./lib/email/portalUrlResolver";
import { resolveEmailApiKey } from "./lib/email/resolveEmailApiKey";

const invitationEmailSentNextStep =
  "A Portal invitation email was sent with a link to set their password.";

const invitationEmailFailedNextStep =
  "The customer was created, but the invitation email could not be sent. Send a password reset email from Firebase Authentication.";

function createTemporaryPassword(): string {
  return randomBytes(24).toString("base64url");
}

function mapHttpsError(error: unknown): never {
  if (error instanceof HttpsError) {
    throw error;
  }

  if (error instanceof Error) {
    throw invalidArgument(error.message);
  }

  throw internal("Unable to create the customer right now.");
}

async function assertEmailAvailableForCustomerInvite(email: string): Promise<void> {
  const [usersSnapshot, customersSnapshot] = await Promise.all([
    adminDb.collection("users").where("email", "==", email).limit(1).get(),
    adminDb.collection("customers").where("email", "==", email).limit(1).get(),
  ]);

  if (!usersSnapshot.empty || !customersSnapshot.empty) {
    throw alreadyExists("That email is already used by another account.");
  }
}

async function generateCustomerPasswordResetLink(email: string): Promise<string> {
  const continueUrl = resolvePortalLoginContinueUrl();

  try {
    return await adminAuth.generatePasswordResetLink(email, {
      url: continueUrl,
      handleCodeInApp: false,
    });
  } catch (error) {
    console.warn("Portal continue URL rejected for password reset; retrying without continue URL.", {
      continueUrl,
      message: error instanceof Error ? error.message : "unknown",
    });

    return adminAuth.generatePasswordResetLink(email);
  }
}

async function sendPortalInvitationEmail(
  email: string,
  displayName: string,
  username: string,
): Promise<boolean> {
  try {
    const resetLink = await generateCustomerPasswordResetLink(email);
    const settings = await loadEmailProviderSettings();

    return sendCustomerPortalInvitationEmail({
      apiKey: resolveEmailApiKey(settings.inviteProvider, {
        resend: resendApiKeySecret.value(),
        brevo: brevoApiKeySecret.value(),
      }),
      provider: settings.inviteProvider,
      fromEmail: invitationFromEmail.value(),
      toEmail: email,
      displayName,
      username,
      resetLink,
    });
  } catch {
    return false;
  }
}

export const createCustomerWithPortalInvite = onCall(
  { secrets: [resendApiKeySecret, brevoApiKeySecret] },
  async (request): Promise<CreateCustomerWithPortalInviteResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    const caller = await loadCallerProfile(request.auth.uid);
    assertCanManageCustomers(caller);

    try {
      const payload = validateCreateCustomerWithPortalInviteRequest(request.data);
      await assertEmailAvailableForCustomerInvite(payload.email);

      const existingAuthUser = await adminAuth.getUserByEmail(payload.email).catch(() => null);

      if (existingAuthUser) {
        throw alreadyExists("That email is already used by another account.");
      }

      const authUser = await adminAuth.createUser({
        email: payload.email,
        displayName: payload.displayName,
        password: createTemporaryPassword(),
        disabled: false,
      });

      const customerRef = adminDb.collection("customers").doc();
      const userRef = adminDb.collection("users").doc(authUser.uid);
      const usernameReservationRef = adminDb.collection("customerUsernames").doc(payload.username);
      const timestamp = FieldValue.serverTimestamp();

      try {
        await adminDb.runTransaction(async (transaction) => {
          const reservationSnapshot = await transaction.get(usernameReservationRef);

          if (reservationSnapshot.exists) {
            throw alreadyExists("That customer username is already taken.");
          }

          transaction.set(
            customerRef,
            withoutUndefinedFields({
              id: customerRef.id,
              userId: authUser.uid,
              displayName: payload.displayName,
              username: payload.username,
              email: payload.email,
              notes: payload.notes,
              isGuest: false,
              signupSource: "studio",
              totalPrintRequests: 0,
              nextPrintRequestSequence: 1,
              usernameUpdatedAt: timestamp,
              createdAt: timestamp,
              updatedAt: timestamp,
            }),
          );

          transaction.set(usernameReservationRef, {
            customerId: customerRef.id,
            createdAt: timestamp,
            updatedAt: timestamp,
          });

          transaction.set(userRef, {
            id: authUser.uid,
            email: payload.email,
            displayName: payload.displayName,
            role: "customer",
            isActive: true,
            createdAt: timestamp,
            updatedAt: timestamp,
            createdBy: caller.id,
          });
        });
      } catch (profileError) {
        await adminAuth.deleteUser(authUser.uid).catch(() => undefined);
        throw profileError;
      }

      const invitationEmailSent = await sendPortalInvitationEmail(
        payload.email,
        payload.displayName,
        payload.username,
      );

      return {
        customerId: customerRef.id,
        userId: authUser.uid,
        email: payload.email,
        displayName: payload.displayName,
        username: payload.username,
        invitationEmailSent,
        nextStep: invitationEmailSent ? invitationEmailSentNextStep : invitationEmailFailedNextStep,
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }

      if (error instanceof Error && "code" in error) {
        const firebaseError = error as Error & { code?: string };

        if (firebaseError.code === "auth/email-already-exists") {
          throw alreadyExists("That email is already used by another account.");
        }
      }

      mapHttpsError(error);
    }
  },
);
