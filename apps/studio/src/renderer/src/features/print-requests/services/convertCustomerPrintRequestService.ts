import type {
  ConvertCustomerPrintRequestToInternalRequest,
  ConvertCustomerPrintRequestToInternalResponse,
} from "@fresh-prints/shared/types/printRequest/convertCustomerPrintRequestToInternal.types";

import { callTracedFunction } from "../../../config/tracedCallable";

export const convertCustomerPrintRequestService = {
  async convertCustomerPrintRequestToInternal(
    input: ConvertCustomerPrintRequestToInternalRequest,
  ): Promise<ConvertCustomerPrintRequestToInternalResponse> {
    return callTracedFunction<
      ConvertCustomerPrintRequestToInternalRequest,
      ConvertCustomerPrintRequestToInternalResponse
    >("convertCustomerPrintRequestToInternal", {
      source: "convertCustomerPrintRequestService.convertCustomerPrintRequestToInternal",
    })(input);
  },
};
