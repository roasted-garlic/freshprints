import { PRINT_REQUEST_QUOTA_ERROR_CODES } from "../../../packages/shared/src/constants/printRequest/printRequestQuotaErrorCodes.constants";
import { sumPrintRequestItemQuantities } from "../../../packages/shared/src/utils/portalShowQueueCapacity";
import {
  formatWorkingRequestFullUserMessage,
  wouldExceedWorkingRequestPrintMax,
} from "../../../packages/shared/src/utils/printRequestWorkingRequestMax";

import { failedPrecondition } from "./errors";
import { logger } from "firebase-functions";

/**
 * Reject when adding `addCount` would push this working request over
 * `maxQuantityPerPrintRequest`. Per-customer-per-show cap uses
 * `maxQuantityPerShowPerCustomer` at queue time.
 */
export function assertWorkingRequestAllowsPrintAdds(input: {
  currentPrintCount: number;
  addCount: number;
  maxPerRequest: number;
}): void {
  if (
    !wouldExceedWorkingRequestPrintMax(
      input.currentPrintCount,
      input.addCount,
      input.maxPerRequest,
    )
  ) {
    return;
  }

  logger.info("working-request-print-max rejected", {
    marker: "per-request-max-v1",
    currentPrintCount: Math.floor(input.currentPrintCount),
    addCount: Math.floor(input.addCount),
    maxPerRequest: Math.floor(input.maxPerRequest),
  });

  throw failedPrecondition(formatWorkingRequestFullUserMessage(input.maxPerRequest), {
    code: PRINT_REQUEST_QUOTA_ERROR_CODES.WORKING_REQUEST_PRINT_LIMIT,
    cap: Math.floor(input.maxPerRequest),
    limit: Math.floor(input.maxPerRequest),
  });
}

/** Sum print quantities from item-like rows already loaded in a transaction. */
export function sumWorkingRequestPrintQuantities(
  items: ReadonlyArray<{ quantity?: number }>,
): number {
  return sumPrintRequestItemQuantities(
    items.map((item) => {
      const quantity = Number(item.quantity ?? 1);
      return {
        quantity: Number.isFinite(quantity) && quantity > 0 ? Math.floor(quantity) : 1,
      };
    }),
  );
}
