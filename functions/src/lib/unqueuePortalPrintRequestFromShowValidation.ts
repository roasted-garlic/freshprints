import type { UnqueuePortalPrintRequestFromShowRequest } from "../../../packages/shared/src/types/portal/unqueuePortalPrintRequestFromShow.types";

export function validateUnqueuePortalPrintRequestFromShowRequest(
  data: unknown,
): UnqueuePortalPrintRequestFromShowRequest {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid request.");
  }

  const record = data as Record<string, unknown>;
  const printRequestId =
    typeof record.printRequestId === "string" ? record.printRequestId.trim() : "";
  const upcomingShowId =
    typeof record.upcomingShowId === "string" ? record.upcomingShowId.trim() : "";

  if (!printRequestId) {
    throw new Error("Print request id is required.");
  }

  return {
    printRequestId,
    ...(upcomingShowId ? { upcomingShowId } : {}),
  };
}
