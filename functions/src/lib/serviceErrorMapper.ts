import { HttpsError } from "firebase-functions/v2/https";

import { internal, invalidArgument } from "./errors";

export function mapServiceError(error: unknown, fallbackMessage: string): HttpsError {
  if (error instanceof HttpsError) {
    return error;
  }

  if (error instanceof Error) {
    if (error.message.includes("permission")) {
      return invalidArgument(error.message);
    }
  }

  return internal(fallbackMessage);
}
