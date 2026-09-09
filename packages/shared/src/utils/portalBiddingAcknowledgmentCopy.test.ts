import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PORTAL_BIDDING_ACKNOWLEDGMENT_VERSION } from "../constants/portal/portalBiddingAcknowledgment.constants";
import {
  PORTAL_BIDDING_ACK_EXCLUSIVE_PARAGRAPH,
  PORTAL_SHOW_PRICE_COMMITMENT_HINT,
  buildPortalBiddingAcknowledgmentCopy,
  buildPortalBiddingAcknowledgmentSignupCopy,
} from "./portalBiddingAcknowledgmentCopy";

describe("PORTAL_SHOW_PRICE_COMMITMENT_HINT", () => {
  it("explains per-size price times quantity without platform-specific wording", () => {
    assert.match(PORTAL_SHOW_PRICE_COMMITMENT_HINT, /per print by size/i);
    assert.match(PORTAL_SHOW_PRICE_COMMITMENT_HINT, /price × the quantity/i);
    assert.doesNotMatch(PORTAL_SHOW_PRICE_COMMITMENT_HINT, /Whatnot|personal bin/i);
    assert.ok(PORTAL_SHOW_PRICE_COMMITMENT_HINT.length <= 120);
  });
});

describe("buildPortalBiddingAcknowledgmentCopy", () => {
  it("uses Add to Show title, price-commitment checkbox, and exclusive note", () => {
    const copy = buildPortalBiddingAcknowledgmentCopy();
    assert.equal(copy.title, "Add to Show");
    assert.equal(
      copy.checkboxLabel,
      "I understand the show pricing and estimated total, and that I am not charged to submit this request.",
    );
    assert.equal(copy.version, PORTAL_BIDDING_ACKNOWLEDGMENT_VERSION);
    assert.equal(copy.version, "portal-bidding-ack-v4");
    assert.equal(copy.paragraphs.at(-1), PORTAL_BIDDING_ACK_EXCLUSIVE_PARAGRAPH);
    assert.match(PORTAL_BIDDING_ACK_EXCLUSIVE_PARAGRAPH, /funkyfreshprints\.com/);
    assert.match(copy.paragraphs.join(" "), /personal bin/);
    assert.doesNotMatch(copy.paragraphs.join(" "), /bid|auction/i);
    assert.doesNotMatch(copy.paragraphs.join(" "), /listed below/i);
    for (const paragraph of copy.paragraphs) {
      assert.doesNotMatch(paragraph, /—/);
    }
  });

  it("keeps the same wording regardless of item count", () => {
    const singular = buildPortalBiddingAcknowledgmentCopy();
    const plural = buildPortalBiddingAcknowledgmentCopy();
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
      "I understand show pricing works by size tier and that requesting designs does not charge me in the Portal.",
    );
    assert.equal(copy.version, "portal-bidding-ack-v4");
    assert.equal(copy.paragraphs.at(-1), PORTAL_BIDDING_ACK_EXCLUSIVE_PARAGRAPH);
    assert.doesNotMatch(copy.paragraphs.join(" "), /bid|auction/i);
    for (const paragraph of copy.paragraphs) {
      assert.doesNotMatch(paragraph, /—/);
    }
  });
});
