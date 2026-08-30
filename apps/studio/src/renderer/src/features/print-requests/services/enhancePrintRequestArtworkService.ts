import { callTracedFunction } from "../../../config/tracedCallable";
import type {
  EnhancePrintRequestArtworkRequest,
  EnhancePrintRequestArtworkResponse,
} from "@fresh-prints/shared/types/printRequest/enhancePrintRequestArtwork.types";

export const enhancePrintRequestArtworkService = {
  async enhancePrintRequestArtwork(
    request: EnhancePrintRequestArtworkRequest,
  ): Promise<EnhancePrintRequestArtworkResponse> {
    const invoke = callTracedFunction<
      EnhancePrintRequestArtworkRequest,
      EnhancePrintRequestArtworkResponse
    >("enhancePrintRequestArtwork", { feature: "print-requests" });
    return invoke(request);
  },
};
