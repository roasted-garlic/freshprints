import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PORTAL_BIDDING_ACKNOWLEDGMENT_VERSION } from "../constants/portal/portalBiddingAcknowledgment.constants";
import {
  PORTAL_BIDDING_ACK_EXCLUSIVE_PARAGRAPH,
  buildPortalBiddingAcknowledgmentCopy,
  buildPortalBiddingAcknowledgmentSignupCopy,
} from "./portalBiddingAcknowledgmentCopy";

describe("buildPortalBiddingAcknowledgmentCopy", () => {
  it("uses Add to Show Print Run title, queue checkbox, and exclusive note", () => {
    const copy = buildPortalBiddingAcknowledgmentCopy(1);
    assert.equal(copy.title, "Add to Show Print Run");
    assert.equal(
      copy.checkboxLabel,
      "I understand that these designs are not reserved for me and will be available for anyone to bid on during the selected live show.",
    );
    assert.equal(copy.version, PORTAL_BIDDING_ACKNOWLEDGMENT_VERSION);
    assert.equal(copy.version, "portal-bidding-ack-v3");
    assert.equal(copy.paragraphs.at(-1), PORTAL_BIDDING_ACK_EXCLUSIVE_PARAGRAPH);
    assert.match(PORTAL_BIDDING_ACK_EXCLUSIVE_PARAGRAPH, /funkyfreshprints\.com/);
    for (const paragraph of copy.paragraphs) {
      assert.doesNotMatch(paragraph, /—/);
    }
  });

  it("keeps the same wording regardless of item count", () => {
    const singular = buildPortalBiddingAcknowledgmentCopy(1);
    const plural = buildPortalBiddingAcknowledgmentCopy(3);
    assert.deepEqual(singular.paragraphs, plural.paragraphs);
    assert.equal(singular.checkboxLabel, plural.checkboxLabel);
  });
});

describe("buildPortalBiddingAcknowledgmentSignupCopy", () => {
  it("uses Request Portal Acknowledgment title, signup checkbox, and exclusive note", () => {
    const copy = buildPortalBiddingAcknowledgmentSignupCopy();
    assert.equal(copy.title, "Request Portal Acknowledgment");
    assert.equal(
      copy.checkboxLabel,
      "I understand how the Fresh Prints Request Portal works and agree that requested designs will be available for anyone to bid on during the live show.",
    );
    assert.equal(copy.version, "portal-bidding-ack-v3");
    assert.equal(copy.paragraphs.at(-1), PORTAL_BIDDING_ACK_EXCLUSIVE_PARAGRAPH);
    for (const paragraph of copy.paragraphs) {
      assert.doesNotMatch(paragraph, /—/);
    }
  });
});
