import { httpsCallable } from "firebase/functions";

import type {
  WipeOperationalTestDataRequest,
  WipeOperationalTestDataResponse,
} from "@fresh-prints/shared/types/admin/wipeOperationalTestData.types";

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

export async function wipeOperationalTestData(
  input: WipeOperationalTestDataRequest,
): Promise<WipeOperationalTestDataResponse> {
  try {
    const callable = httpsCallable<WipeOperationalTestDataRequest, WipeOperationalTestDataResponse>(
      functions,
      "wipeOperationalTestData",
    );
    const response = await callable(input);
    return response.data;
  } catch (error) {
    throw new Error(
      getCallableErrorMessage(error, "Unable to wipe operational test data. Please try again."),
    );
  }
}
