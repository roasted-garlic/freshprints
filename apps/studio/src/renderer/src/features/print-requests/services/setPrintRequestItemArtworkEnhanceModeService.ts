import { callTracedFunction } from "../../../config/tracedCallable";
import type {
  SetPrintRequestItemArtworkEnhanceModeRequest,
  SetPrintRequestItemArtworkEnhanceModeResponse,
} from "@fresh-prints/shared/types/printRequest/setPrintRequestItemArtworkEnhanceMode.types";

/** Server `timeoutSeconds: 300` — client must exceed the SDK's 70s default. */
const SET_PRINT_REQUEST_ITEM_ARTWORK_ENHANCE_MODE_CLIENT_TIMEOUT_MS = 320_000;

export const setPrintRequestItemArtworkEnhanceModeService = {
  async setMode(
    request: SetPrintRequestItemArtworkEnhanceModeRequest,
  ): Promise<SetPrintRequestItemArtworkEnhanceModeResponse> {
    const invoke = callTracedFunction<
      SetPrintRequestItemArtworkEnhanceModeRequest,
      SetPrintRequestItemArtworkEnhanceModeResponse
    >("setPrintRequestItemArtworkEnhanceMode", { feature: "print-requests" }, undefined, {
      timeout: SET_PRINT_REQUEST_ITEM_ARTWORK_ENHANCE_MODE_CLIENT_TIMEOUT_MS,
    });
    return invoke(request);
  },
};
