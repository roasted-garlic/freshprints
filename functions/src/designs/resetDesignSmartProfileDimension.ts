import { onCall } from "firebase-functions/v2/https";

import type { SmartProfileEditableDimensionKey } from "../../../packages/shared/src/constants/smartProfile.constants";
import { isSmartProfileEditableDimensionKey } from "../../../packages/shared/src/utils/smartProfileStaffEdit";
import { loadCallerProfile } from "../lib/caller";
import { invalidArgument, unauthenticated } from "../lib/errors";
import { mapServiceError } from "../lib/serviceErrorMapper";
import {
  applyDesignSmartProfileDimensionReset,
  type DesignSmartProfileMutationResponse,
  type ResetDesignSmartProfileDimensionRequest,
} from "./designSmartProfileStaffUpdate";

function parseRequest(data: unknown): ResetDesignSmartProfileDimensionRequest {
  if (!data || typeof data !== "object") {
    throw invalidArgument("Request data is required.");
  }

  const designId =
    "designId" in data && typeof data.designId === "string" ? data.designId.trim() : "";
  if (!designId) {
    throw invalidArgument("designId is required.");
  }

  const dimensionKey =
    "dimensionKey" in data && typeof data.dimensionKey === "string"
      ? data.dimensionKey.trim()
      : "";
  if (!isSmartProfileEditableDimensionKey(dimensionKey)) {
    throw invalidArgument("A valid dimensionKey is required.");
  }

  return { designId, dimensionKey: dimensionKey as SmartProfileEditableDimensionKey };
}

export const resetDesignSmartProfileDimension = onCall(
  async (request): Promise<DesignSmartProfileMutationResponse> => {
    try {
      if (!request.auth?.uid) {
        throw unauthenticated();
      }

      const caller = await loadCallerProfile(request.auth.uid);
      const payload = parseRequest(request.data);
      return await applyDesignSmartProfileDimensionReset({
        caller,
        designId: payload.designId,
        dimensionKey: payload.dimensionKey,
      });
    } catch (error) {
      throw mapServiceError(error, "Unable to reset Smart Profile dimension.");
    }
  },
);
