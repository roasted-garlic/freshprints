import { FirebaseError } from "firebase/app";

const genericFirestoreMessages = new Set(["missing or insufficient permissions."]);

export function getFirestoreErrorMessage(error: unknown, fallbackMessage: string): string {
  if (!(error instanceof FirebaseError)) {
    return fallbackMessage;
  }

  const message = error.message?.trim() ?? "";

  switch (error.code) {
    case "permission-denied":
      return message && !genericFirestoreMessages.has(message.toLowerCase())
        ? message
        : "You do not have permission to perform this action.";
    case "not-found":
      return message || "The requested record was not found.";
    case "invalid-argument":
      return message || "The request contains invalid data.";
    case "failed-precondition":
      if (/index/i.test(message) && /building/i.test(message)) {
        return "The catalog search index is still building. Try again in a few minutes.";
      }

      return message || "This operation cannot be completed right now.";
    default:
      if (message) {
        return message;
      }

      return fallbackMessage;
  }
}
