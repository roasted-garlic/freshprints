import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildAssistedCatalogShareReadyNotificationHref,
  buildAssistedCatalogShareReadyNotificationId,
  buildAssistedProofReadyNotificationHref,
  buildAssistedProofReadyNotificationId,
  buildAssistedStaffMessageNotificationHref,
  buildAssistedStaffMessageNotificationId,
  buildCustomerNotificationHref,
  buildCustomerNotificationTitle,
  buildCustomerUploadCatalogPermissionFollowUpNotificationId,
  CUSTOMER_NOTIFICATION_CATALOG_SHARE_BODY,
  CUSTOMER_NOTIFICATION_PROOF_BODY,
  isAssistedBrowserPushOptedIn,
  isCustomerNotificationPreservedFromHistoryClear,
  isCustomerNotificationStickyUntilResolved,
  isCustomerNotificationVisibleInHistory,
  truncateCustomerNotificationBody,
} from "./customerNotifications";

describe("customerNotifications helpers", () => {
  it("builds deep links for proof, catalog share, and messages", () => {
    assert.match(buildAssistedProofReadyNotificationHref(), /detailTab=proofs/);
    assert.match(buildAssistedCatalogShareReadyNotificationHref(), /detailTab=overview/);
    assert.match(buildAssistedStaffMessageNotificationHref(), /detailTab=messages/);
    assert.equal(
      buildCustomerNotificationHref("assisted_proof_ready"),
      buildAssistedProofReadyNotificationHref(),
    );
    assert.equal(
      buildCustomerNotificationHref("assisted_catalog_share_ready"),
      buildAssistedCatalogShareReadyNotificationHref(),
    );
    assert.equal(
      buildCustomerNotificationHref(
        "customer_upload_catalog_permission_follow_up",
        "opaque-token",
      ),
      "/requests/artwork?permissionRequest=opaque-token",
    );
  });

  it("builds stable notification ids", () => {
    assert.equal(buildAssistedProofReadyNotificationId("r1", "p1"), "proof_r1_p1");
    assert.equal(buildAssistedCatalogShareReadyNotificationId("r1", "d1"), "catalog_r1_d1");
    assert.equal(buildAssistedStaffMessageNotificationId("r1", 99), "msg_r1_99");
    assert.equal(
      buildCustomerUploadCatalogPermissionFollowUpNotificationId("tok"),
      "customer_upload_permission_tok",
    );
  });

  it("keeps permission follow-ups sticky in Alerts and always visible in history", () => {
    assert.equal(
      isCustomerNotificationStickyUntilResolved("customer_upload_catalog_permission_follow_up"),
      true,
    );
    assert.equal(isCustomerNotificationStickyUntilResolved("assisted_proof_ready"), false);
    assert.equal(
      isCustomerNotificationVisibleInHistory({
        kind: "customer_upload_catalog_permission_follow_up",
        readAt: null,
      }),
      true,
    );
    assert.equal(
      isCustomerNotificationVisibleInHistory({
        kind: "assisted_proof_ready",
        readAt: null,
      }),
      false,
    );
    assert.equal(
      isCustomerNotificationVisibleInHistory({
        kind: "assisted_proof_ready",
        readAt: new Date(),
      }),
      true,
    );
    assert.equal(
      isCustomerNotificationVisibleInHistory({
        kind: "assisted_proof_ready",
        readAt: new Date(),
        clearedFromHistoryAt: new Date(),
      }),
      false,
    );
    assert.equal(
      isCustomerNotificationPreservedFromHistoryClear({
        kind: "customer_upload_catalog_permission_follow_up",
        readAt: null,
      }),
      true,
    );
    assert.equal(
      isCustomerNotificationPreservedFromHistoryClear({
        kind: "customer_upload_catalog_permission_follow_up",
        readAt: new Date(),
      }),
      false,
    );
  });

  it("uses operational alert titles and fixed proof / catalog bodies", () => {
    assert.equal(buildCustomerNotificationTitle("assisted_staff_message"), "New message");
    assert.equal(buildCustomerNotificationTitle("assisted_proof_ready"), "New proof");
    assert.equal(
      buildCustomerNotificationTitle("assisted_catalog_share_ready"),
      "Library design match",
    );
    assert.equal(
      buildCustomerNotificationTitle("customer_upload_catalog_permission_follow_up"),
      "Permission to use your artwork",
    );
    assert.equal(CUSTOMER_NOTIFICATION_PROOF_BODY, "Review the latest proof for your request.");
    assert.equal(
      CUSTOMER_NOTIFICATION_CATALOG_SHARE_BODY,
      "We found a Library design that matches your request. Approve it or request changes with a short note.",
    );
  });

  it("truncates bodies and defaults browser push opt-in", () => {
    assert.equal(truncateCustomerNotificationBody("hi"), "hi");
    assert.match(truncateCustomerNotificationBody("x".repeat(200), 40), /…$/);
    assert.equal(isAssistedBrowserPushOptedIn(undefined), true);
    assert.equal(isAssistedBrowserPushOptedIn(false), false);
  });
});
