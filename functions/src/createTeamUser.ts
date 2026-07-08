import { randomBytes } from "node:crypto";

import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

import { adminAuth, adminDb } from "./lib/admin";
import { loadCallerProfile } from "./lib/caller";
import { alreadyExists, internal, invalidArgument, permissionDenied, unauthenticated } from "./lib/errors";
import { assertCanCreateTeamRole, assertTeamUserRole } from "./lib/permissions";
import { sendTeamInvitationEmail } from "./lib/resendEmailService";
import { resendApiKeySecret, invitationFromEmail } from "./lib/secrets";
import type { CreateTeamUserRequest, CreateTeamUserResponse } from "./lib/types";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const invitationEmailSentNextStep =
  "An invitation email was sent with a link to set their password.";

const invitationEmailFailedNextStep =
  "The account was created, but the invitation email could not be sent. Send a password reset email from Firebase Authentication.";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeDisplayName(displayName: string): string {
  return displayName.trim();
}

function createTemporaryPassword(): string {
  return randomBytes(24).toString("base64url");
}

function validateRequest(data: CreateTeamUserRequest): CreateTeamUserRequest {
  if (!data || typeof data !== "object") {
    throw invalidArgument("Request data is required.");
  }

  const email = typeof data.email === "string" ? normalizeEmail(data.email) : "";
  const displayName = typeof data.displayName === "string" ? normalizeDisplayName(data.displayName) : "";

  if (!email || !emailPattern.test(email)) {
    throw invalidArgument("Enter a valid email address.");
  }

  if (!displayName || displayName.length < 2) {
    throw invalidArgument("Display name must be at least 2 characters.");
  }

  if (displayName.length > 80) {
    throw invalidArgument("Display name must be 80 characters or fewer.");
  }

  assertTeamUserRole(data.role);

  return {
    email,
    displayName,
    role: data.role,
  };
}

async function sendInvitationEmail(
  email: string,
  displayName: string,
  role: CreateTeamUserRequest["role"],
): Promise<boolean> {
  try {
    const resetLink = await adminAuth.generatePasswordResetLink(email);
    return sendTeamInvitationEmail({
      apiKey: resendApiKeySecret.value(),
      fromEmail: invitationFromEmail.value(),
      toEmail: email,
      displayName,
      role,
      resetLink,
    });
  } catch {
    return false;
  }
}

export const createTeamUser = onCall(
  { secrets: [resendApiKeySecret] },
  async (request): Promise<CreateTeamUserResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    const caller = await loadCallerProfile(request.auth.uid);

    if (!caller.isActive) {
      throw permissionDenied("Inactive accounts cannot create users.");
    }

    const payload = validateRequest(request.data as CreateTeamUserRequest);
    assertCanCreateTeamRole(caller.role, payload.role);

    try {
      const existingUser = await adminAuth.getUserByEmail(payload.email).catch(() => null);

      if (existingUser) {
        throw alreadyExists();
      }

      const authUser = await adminAuth.createUser({
        email: payload.email,
        displayName: payload.displayName,
        password: createTemporaryPassword(),
        disabled: false,
      });

      try {
        await adminDb.collection("users").doc(authUser.uid).set({
          id: authUser.uid,
          email: payload.email,
          displayName: payload.displayName,
          role: payload.role,
          isActive: true,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          createdBy: caller.id,
        });
      } catch (profileError) {
        await adminAuth.deleteUser(authUser.uid).catch(() => undefined);
        throw profileError;
      }

      const invitationEmailSent = await sendInvitationEmail(
        payload.email,
        payload.displayName,
        payload.role,
      );

      return {
        userId: authUser.uid,
        email: payload.email,
        displayName: payload.displayName,
        role: payload.role,
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
          throw alreadyExists();
        }
      }

      throw internal("Unable to create the user right now.");
    }
  },
);
