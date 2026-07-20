import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PORTAL_BIDDING_ACKNOWLEDGMENT_VERSION } from "../../../packages/shared/src/constants/portal/portalBiddingAcknowledgment.constants";
import {
  STALE_QUEUE_SELECTIONS_MESSAGE,
  validateQueuePortalPrintRequestToShowRequest,
} from "./queuePortalPrintRequestToShowValidation";

describe("validateQueuePortalPrintRequestToShowRequest", () => {
  it("accepts valid ids with acknowledgment (full-fit path)", () => {
    assert.deepEqual(
      validateQueuePortalPrintRequestToShowRequest({
        printRequestId: " req-1 ",
        upcomingShowId: " show-1 ",
        biddingAcknowledgmentAccepted: true,
        biddingAcknowledgmentVersion: PORTAL_BIDDING_ACKNOWLEDGMENT_VERSION,
      }),
      {
        printRequestId: "req-1",
        upcomingShowId: "show-1",
        biddingAcknowledgmentAccepted: true,
        biddingAcknowledgmentVersion: PORTAL_BIDDING_ACKNOWLEDGMENT_VERSION,
      },
    );
  });

  it("rejects stale selections with soft-reload message", () => {
    assert.throws(
      () =>
        validateQueuePortalPrintRequestToShowRequest({
          printRequestId: "req-1",
          upcomingShowId: "show-1",
          biddingAcknowledgmentAccepted: true,
          biddingAcknowledgmentVersion: PORTAL_BIDDING_ACKNOWLEDGMENT_VERSION,
          selections: [{ printRequestItemId: "design-a", quantity: 12 }],
        }),
      (error: unknown) =>
        error instanceof Error && error.message === STALE_QUEUE_SELECTIONS_MESSAGE,
    );
  });

  it("rejects empty selections array as stale", () => {
    assert.throws(
      () =>
        validateQueuePortalPrintRequestToShowRequest({
          printRequestId: "req-1",
          upcomingShowId: "show-1",
          biddingAcknowledgmentAccepted: true,
          biddingAcknowledgmentVersion: PORTAL_BIDDING_ACKNOWLEDGMENT_VERSION,
          selections: [],
        }),
      /out of date|Soft-reload/i,
    );
  });

  it("rejects missing print request id", () => {
    assert.throws(
      () =>
        validateQueuePortalPrintRequestToShowRequest({
          upcomingShowId: "show-1",
          biddingAcknowledgmentAccepted: true,
          biddingAcknowledgmentVersion: PORTAL_BIDDING_ACKNOWLEDGMENT_VERSION,
        }),
      /print request id/i,
    );
  });

  it("rejects missing show id", () => {
    assert.throws(
      () =>
        validateQueuePortalPrintRequestToShowRequest({
          printRequestId: "req-1",
          biddingAcknowledgmentAccepted: true,
          biddingAcknowledgmentVersion: PORTAL_BIDDING_ACKNOWLEDGMENT_VERSION,
        }),
      /show id/i,
    );
  });

  it("rejects missing bidding acknowledgment", () => {
    assert.throws(
      () =>
        validateQueuePortalPrintRequestToShowRequest({
          printRequestId: "req-1",
          upcomingShowId: "show-1",
        }),
      /public bidding/i,
    );
  });

  it("rejects false bidding acknowledgment", () => {
    assert.throws(
      () =>
        validateQueuePortalPrintRequestToShowRequest({
          printRequestId: "req-1",
          upcomingShowId: "show-1",
          biddingAcknowledgmentAccepted: false,
          biddingAcknowledgmentVersion: PORTAL_BIDDING_ACKNOWLEDGMENT_VERSION,
        }),
      /public bidding/i,
    );
  });

  it("rejects unknown acknowledgment version", () => {
    assert.throws(
      () =>
        validateQueuePortalPrintRequestToShowRequest({
          printRequestId: "req-1",
          upcomingShowId: "show-1",
          biddingAcknowledgmentAccepted: true,
          biddingAcknowledgmentVersion: "old-v0",
        }),
      /out of date/i,
    );
  });
});
