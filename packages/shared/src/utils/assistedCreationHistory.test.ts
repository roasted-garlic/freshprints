import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ASSISTED_CREATION_PROOF_EMAIL_SENT_NOTE,
  ASSISTED_CREATION_REQUEST_UPDATED_NOTE,
  buildAssistedCreationUpdateAckDocId,
  countUnreadAssistedCreationCustomerUpdates,
  formatAssistedCreationRequestUpdatedNote,
  isAssistedCreationCustomerUpdateEntry,
  isAssistedCreationProofEmailSentEntry,
  isAssistedProofEmailOptedIn,
  latestAssistedCreationCustomerUpdateAtMs,
} from "./assistedCreationHistory";

describe("assistedCreationHistory helpers", () => {
  it("formats request-updated notes without redundant Customer actor", () => {
    assert.equal(formatAssistedCreationRequestUpdatedNote(), ASSISTED_CREATION_REQUEST_UPDATED_NOTE);
    assert.equal(
      formatAssistedCreationRequestUpdatedNote("  more detail  "),
      `${ASSISTED_CREATION_REQUEST_UPDATED_NOTE} — more detail`,
    );
  });

  it("detects customer update entries structurally and via legacy notes", () => {
    assert.equal(
      isAssistedCreationCustomerUpdateEntry({
        fromStatus: "submitted",
        toStatus: "submitted",
        byRole: "customer",
        note: ASSISTED_CREATION_REQUEST_UPDATED_NOTE,
      }),
      true,
    );
    assert.equal(
      isAssistedCreationCustomerUpdateEntry({
        fromStatus: "submitted",
        toStatus: "submitted",
        byRole: "system",
        note: "Customer updated request — hello",
      }),
      true,
    );
    assert.equal(
      isAssistedCreationCustomerUpdateEntry({
        fromStatus: "submitted",
        toStatus: "in_progress",
        byRole: "customer",
        note: "Request updated",
      }),
      false,
    );
  });

  it("counts unread updates after readThroughAt", () => {
    const history = [
      {
        at: 1_000,
        byUid: "c1",
        byRole: "customer" as const,
        note: "Request updated",
        fromStatus: "submitted" as const,
        toStatus: "submitted" as const,
      },
      {
        at: 2_000,
        byUid: "c1",
        byRole: "customer" as const,
        note: "Request updated — again",
        fromStatus: "submitted" as const,
        toStatus: "submitted" as const,
      },
    ];
    assert.equal(countUnreadAssistedCreationCustomerUpdates(history, null), 2);
    assert.equal(countUnreadAssistedCreationCustomerUpdates(history, 1_000), 1);
    assert.equal(countUnreadAssistedCreationCustomerUpdates(history, 2_000), 0);
    assert.equal(latestAssistedCreationCustomerUpdateAtMs(history), 2_000);
  });

  it("recognizes proof-ready email sent history", () => {
    assert.equal(
      isAssistedCreationProofEmailSentEntry({
        byRole: "system",
        note: ASSISTED_CREATION_PROOF_EMAIL_SENT_NOTE,
      }),
      true,
    );
    assert.equal(buildAssistedCreationUpdateAckDocId("u1", "r1"), "u1__r1");
    assert.equal(isAssistedProofEmailOptedIn(undefined), true);
    assert.equal(isAssistedProofEmailOptedIn(true), true);
    assert.equal(isAssistedProofEmailOptedIn(false), false);
  });
});
