import { callTracedFunction } from "../../../config/tracedCallable";
import type { DesignSmartProfile } from "@fresh-prints/shared/types/catalog/smartProfile.types";
import type { SmartProfileEditableDimensionKey } from "@fresh-prints/shared/constants/smartProfile.constants";

export interface UpdateDesignSmartProfileDimensionsRequest {
  designId: string;
  dimensions: Partial<Record<SmartProfileEditableDimensionKey, string[]>>;
}

export interface ResetDesignSmartProfileDimensionRequest {
  designId: string;
  dimensionKey: SmartProfileEditableDimensionKey;
}

export interface DesignSmartProfileMutationResponse {
  designId: string;
  smartProfile: DesignSmartProfile;
}

const updateDimensionsCallable = callTracedFunction<
  UpdateDesignSmartProfileDimensionsRequest,
  DesignSmartProfileMutationResponse
>("updateDesignSmartProfileDimensions", { source: "designSmartProfileService.update" });

const resetDimensionCallable = callTracedFunction<
  ResetDesignSmartProfileDimensionRequest,
  DesignSmartProfileMutationResponse
>("resetDesignSmartProfileDimension", { source: "designSmartProfileService.reset" });

export async function updateDesignSmartProfileDimensions(
  request: UpdateDesignSmartProfileDimensionsRequest,
): Promise<DesignSmartProfileMutationResponse> {
  return updateDimensionsCallable(request);
}

export async function resetDesignSmartProfileDimension(
  request: ResetDesignSmartProfileDimensionRequest,
): Promise<DesignSmartProfileMutationResponse> {
  return resetDimensionCallable(request);
}
