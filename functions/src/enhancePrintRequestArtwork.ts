import { onCall } from "firebase-functions/v2/https";

import type {
  EnhancePrintRequestArtworkRequest,
  EnhancePrintRequestArtworkResponse,
} from "../../packages/shared/src/types/printRequest/enhancePrintRequestArtwork.types";

import { executeEnhancePrintRequestArtwork } from "./lib/enhancePrintRequestArtworkCore";
import { invalidArgument, unauthenticated } from "./lib/errors";

export const enhancePrintRequestArtwork = onCall(
  { timeoutSeconds: 300, memory: "1GiB" },
  async (request): Promise<EnhancePrintRequestArtworkResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    let parsed: EnhancePrintRequestArtworkRequest;
    try {
      parsed = parseRequest(request.data);
    } catch (error) {
      throw invalidArgument(error instanceof Error ? error.message : "Invalid request.");
    }

    return executeEnhancePrintRequestArtwork(request.auth.uid, parsed);
  },
);

function parseRequest(data: unknown): EnhancePrintRequestArtworkRequest {
  if (!data || typeof data !== "object") {
    throw new Error("Request data is required.");
  }

  const printRequestId =
    "printRequestId" in data && typeof data.printRequestId === "string"
      ? data.printRequestId.trim()
      : "";
  const itemId = "itemId" in data && typeof data.itemId === "string" ? data.itemId.trim() : "";

  if (!printRequestId || !itemId) {
    throw new Error("Print request item is required.");
  }

  return {
    printRequestId,
    itemId,
    confirmCatalogEnhance:
      "confirmCatalogEnhance" in data && data.confirmCatalogEnhance === true,
  };
}
