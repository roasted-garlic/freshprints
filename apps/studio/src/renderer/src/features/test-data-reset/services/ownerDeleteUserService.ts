import { httpsCallable } from "firebase/functions";

import type {
  OwnerDeleteUserRequest,
  OwnerDeleteUserResponse,
} from "@fresh-prints/shared/types/account/portalAccountSettings.types";

import { functions } from "../../../config/firebase";

function getCallableErrorMessage(error: unknown, fallbackMessage: string): string {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string" &&
    error.message.trim()
  ) {
    return error.message;
  }

  return fallbackMessage;
}

export async function ownerDeleteUser(
  input: OwnerDeleteUserRequest,
): Promise<OwnerDeleteUserResponse> {
  try {
    const callable = httpsCallable<OwnerDeleteUserRequest, OwnerDeleteUserResponse>(
      functions,
      "ownerDeleteUser",
    );
    const response = await callable(input);
    return response.data;
  } catch (error) {
    throw new Error(getCallableErrorMessage(error, "Unable to delete the user. Please try again."));
  }
}
