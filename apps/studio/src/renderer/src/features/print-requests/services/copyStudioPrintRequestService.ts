import type {
  CopyStudioPrintRequestRequest,
  CopyStudioPrintRequestResponse,
} from "@fresh-prints/shared/types/printRequest/copyStudioPrintRequest.types";

import { callTracedFunction } from "../../../config/tracedCallable";

export const copyStudioPrintRequestService = {
  async copy(input: CopyStudioPrintRequestRequest): Promise<CopyStudioPrintRequestResponse> {
    return callTracedFunction<CopyStudioPrintRequestRequest, CopyStudioPrintRequestResponse>(
      "copyStudioPrintRequest",
      { source: "copyStudioPrintRequestService.copy" },
    )(input);
  },
};
