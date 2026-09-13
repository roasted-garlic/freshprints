import { onCall } from "firebase-functions/v2/https";

import { loadCallerProfile } from "../lib/caller";
import { invalidArgument, unauthenticated } from "../lib/errors";
import { mapServiceError } from "../lib/serviceErrorMapper";
import type { SmartProfileEditableDimensionKey } from "../../../packages/shared/src/constants/smartProfile.constants";
import { isSmartProfileEditableDimensionKey } from "../../../packages/shared/src/utils/smartProfileStaffEdit";
import {
  applyDesignSmartProfileDimensionPatch,
  type DesignSmartProfileMutationResponse,
  type UpdateDesignSmartProfileDimensionsRequest,
} from "./designSmartProfileStaffUpdate";

function parseRequest(data: unknown): UpdateDesignSmartProfileDimensionsRequest {
  if (!data || typeof data !== "object") {
    throw invalidArgument("Request data is required.");
  }

  const designId =
    "designId" in data && typeof data.designId === "string" ? data.designId.trim() : "";
  if (!designId) {
    throw invalidArgument("designId is required.");
  }

  if (!("dimensions" in data) || !data.dimensions || typeof data.dimensions !== "object") {
    throw invalidArgument("dimensions object is required.");
  }

  const dimensions: Partial<Record<SmartProfileEditableDimensionKey, string[]>> = {};
  for (const [key, value] of Object.entries(data.dimensions as Record<string, unknown>)) {
    if (!isSmartProfileEditableDimensionKey(key)) {
      throw invalidArgument(`Invalid dimension key: ${key}`);
    }
    if (!Array.isArray(value)) {
      throw invalidArgument(`Dimension ${key} must be an array.`);
    }
    dimensions[key] = value.filter((item): item is string => typeof item === "string");
  }

  return { designId, dimensions };
}

export const updateDesignSmartProfileDimensions = onCall(
  async (request): Promise<DesignSmartProfileMutationResponse> => {
    try {
      if (!request.auth?.uid) {
        throw unauthenticated();
      }

      const caller = await loadCallerProfile(request.auth.uid);
      const payload = parseRequest(request.data);
      return await applyDesignSmartProfileDimensionPatch({
        caller,
        designId: payload.designId,
        dimensions: payload.dimensions,
      });
    } catch (error) {
      throw mapServiceError(error, "Unable to update Smart Profile dimensions.");
    }
  },
);
