import type {
  CreateTeamUserInput,
  CreateTeamUserResult,
  UpdateTeamUserInput,
  UpdateTeamUserResult,
} from "../types/userManagement.types";
import { FirebaseError } from "firebase/app";
import { httpsCallable } from "firebase/functions";

import { functions } from "../../../config/firebase";

const genericCallableMessages = new Set([
  "internal",
  "unknown",
  "unavailable",
  "deadline-exceeded",
  "aborted",
  "cancelled",
  "data-loss",
]);

function isGenericCallableMessage(message: string): boolean {
  const normalized = message.trim().toLowerCase();
  return genericCallableMessages.has(normalized);
}

function getCallableErrorMessage(error: unknown, fallbackMessage: string): string {
  if (!(error instanceof FirebaseError)) {
    return fallbackMessage;
  }

  const message = error.message?.trim() ?? "";

  switch (error.code) {
    case "functions/unauthenticated":
      return "You must be signed in to manage users.";
    case "functions/permission-denied":
      return message && !isGenericCallableMessage(message)
        ? message
        : "You do not have permission to update this user.";
    case "functions/invalid-argument":
      return message || "Check the request and try again.";
    case "functions/not-found":
      return message || "The target user profile was not found.";
    case "functions/failed-precondition":
      return message || "This account cannot be changed right now.";
    case "functions/already-exists":
      return message || "A user with this email already exists.";
    case "functions/unavailable":
      return message && !isGenericCallableMessage(message)
        ? message
        : "User management is unavailable right now. Confirm Cloud Functions are deployed.";
    case "functions/internal":
      return fallbackMessage;
    default:
      if (message && !isGenericCallableMessage(message)) {
        return message;
      }

      return fallbackMessage;
  }
}

export const userManagementService = {
  async createTeamUser(input: CreateTeamUserInput): Promise<CreateTeamUserResult> {
    try {
      const createTeamUserCallable = httpsCallable<CreateTeamUserInput, CreateTeamUserResult>(
        functions,
        "createTeamUser",
      );
      const response = await createTeamUserCallable(input);
      return response.data;
    } catch (error) {
      throw new Error(getCallableErrorMessage(error, "Unable to create the user. Please try again."));
    }
  },

  async updateTeamUser(input: UpdateTeamUserInput): Promise<UpdateTeamUserResult> {
    try {
      const updateTeamUserCallable = httpsCallable<UpdateTeamUserInput, UpdateTeamUserResult>(
        functions,
        "updateTeamUser",
      );
      const response = await updateTeamUserCallable(input);
      return response.data;
    } catch (error) {
      throw new Error(
        getCallableErrorMessage(error, "Unable to update the user. Please try again."),
      );
    }
  },
};
