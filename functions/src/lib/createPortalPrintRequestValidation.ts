import type { CreatePortalPrintRequestRequest } from "../../../packages/shared/src/types/printRequest/createPortalPrintRequest.types";

const MAX_NOTES_LENGTH = 2000;

export function validateCreatePortalPrintRequestRequest(data: unknown): CreatePortalPrintRequestRequest {
  if (data === undefined || data === null) {
    return {};
  }

  if (typeof data !== "object") {
    throw new Error("Request data must be an object.");
  }

  const payload = data as CreatePortalPrintRequestRequest;

  if (payload.notes === undefined) {
    return {};
  }

  if (typeof payload.notes !== "string") {
    throw new Error("Notes must be text.");
  }

  const notes = payload.notes.trim();

  if (notes.length > MAX_NOTES_LENGTH) {
    throw new Error(`Notes must be ${MAX_NOTES_LENGTH} characters or fewer.`);
  }

  return notes ? { notes } : {};
}
