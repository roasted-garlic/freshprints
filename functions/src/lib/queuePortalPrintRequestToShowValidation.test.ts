import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { validateQueuePortalPrintRequestToShowRequest } from "./queuePortalPrintRequestToShowValidation";

describe("validateQueuePortalPrintRequestToShowRequest", () => {
  it("accepts valid ids", () => {
    assert.deepEqual(
      validateQueuePortalPrintRequestToShowRequest({
        printRequestId: " req-1 ",
        upcomingShowId: " show-1 ",
      }),
      {
        printRequestId: "req-1",
        upcomingShowId: "show-1",
      },
    );
  });

  it("rejects missing print request id", () => {
    assert.throws(
      () => validateQueuePortalPrintRequestToShowRequest({ upcomingShowId: "show-1" }),
      /print request id/i,
    );
  });

  it("rejects missing show id", () => {
    assert.throws(
      () => validateQueuePortalPrintRequestToShowRequest({ printRequestId: "req-1" }),
      /show id/i,
    );
  });
});
