import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PORTAL_PRINT_REQUEST_SHOW_SCHEDULE_BATCH_MAX } from "../../../packages/shared/src/utils/portalCustomerShowSchedule";

import { validateGetPortalPrintRequestShowSchedulesRequest } from "./getPortalPrintRequestShowSchedulesValidation";

describe("validateGetPortalPrintRequestShowSchedulesRequest", () => {
  it("accepts a unique trimmed id list", () => {
    assert.deepEqual(
      validateGetPortalPrintRequestShowSchedulesRequest({
        printRequestIds: [" request-1 ", "request-2"],
      }),
      { printRequestIds: ["request-1", "request-2"] },
    );
  });

  it("rejects empty arrays", () => {
    assert.throws(
      () => validateGetPortalPrintRequestShowSchedulesRequest({ printRequestIds: [] }),
      /At least one print request id is required/,
    );
  });

  it("rejects duplicate ids", () => {
    assert.throws(
      () =>
        validateGetPortalPrintRequestShowSchedulesRequest({
          printRequestIds: ["request-1", "request-1"],
        }),
      /unique/i,
    );
  });

  it("rejects batches above the shared cap", () => {
    const printRequestIds = Array.from(
      { length: PORTAL_PRINT_REQUEST_SHOW_SCHEDULE_BATCH_MAX + 1 },
      (_, index) => `request-${index}`,
    );
    assert.throws(
      () => validateGetPortalPrintRequestShowSchedulesRequest({ printRequestIds }),
      /At most 50 print requests/,
    );
  });
});
