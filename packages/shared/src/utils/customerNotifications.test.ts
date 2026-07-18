import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildAssistedProofReadyNotificationHref,
  buildAssistedProofReadyNotificationId,
  buildAssistedStaffMessageNotificationHref,
  buildAssistedStaffMessageNotificationId,
  buildCustomerNotificationHref,
  buildCustomerNotificationTitle,
  CUSTOMER_NOTIFICATION_PROOF_BODY,
  isAssistedBrowserPushOptedIn,
  truncateCustomerNotificationBody,
} from "./customerNotifications";

describe("customerNotifications helpers", () => {
  it("builds deep links for proof and messages", () => {
    assert.match(buildAssistedProofReadyNotificationHref(), /detailTab=proofs/);
    assert.match(buildAssistedStaffMessageNotificationHref(), /detailTab=messages/);
    assert.equal(
      buildCustomerNotificationHref("assisted_proof_ready"),
      buildAssistedProofReadyNotificationHref(),
    );
  });

  it("builds stable notification ids", () => {
    assert.equal(buildAssistedProofReadyNotificationId("r1", "p1"), "proof_r1_p1");
    assert.equal(buildAssistedStaffMessageNotificationId("r1", 99), "msg_r1_99");
  });

  it("uses operational alert titles and fixed proof body", () => {
    assert.equal(buildCustomerNotificationTitle("assisted_staff_message"), "New message");
    assert.equal(buildCustomerNotificationTitle("assisted_proof_ready"), "New proof");
    assert.equal(CUSTOMER_NOTIFICATION_PROOF_BODY, "Review the latest proof for your request.");
  });

  it("truncates bodies and defaults browser push opt-in", () => {
    assert.equal(truncateCustomerNotificationBody("hi"), "hi");
    assert.match(truncateCustomerNotificationBody("x".repeat(200), 40), /…$/);
    assert.equal(isAssistedBrowserPushOptedIn(undefined), true);
    assert.equal(isAssistedBrowserPushOptedIn(false), false);
  });
});
