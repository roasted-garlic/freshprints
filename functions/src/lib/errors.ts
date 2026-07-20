import { HttpsError } from "firebase-functions/v2/https";

export function unauthenticated(message = "You must be signed in."): HttpsError {
  return new HttpsError("unauthenticated", message);
}

export function permissionDenied(message = "You do not have permission to perform this action."): HttpsError {
  return new HttpsError("permission-denied", message);
}

export function invalidArgument(message: string): HttpsError {
  return new HttpsError("invalid-argument", message);
}

export function alreadyExists(message = "A user with this email already exists."): HttpsError {
  return new HttpsError("already-exists", message);
}

export function internal(message = "An internal error occurred."): HttpsError {
  return new HttpsError("internal", message);
}

export function failedPrecondition(message: string, details?: unknown): HttpsError {
  return new HttpsError("failed-precondition", message, details);
}

export function resourceExhausted(message: string, details?: unknown): HttpsError {
  return new HttpsError("resource-exhausted", message, details);
}

export function notFound(message: string): HttpsError {
  return new HttpsError("not-found", message);
}

export function unavailable(message: string): HttpsError {
  return new HttpsError("unavailable", message);
}
