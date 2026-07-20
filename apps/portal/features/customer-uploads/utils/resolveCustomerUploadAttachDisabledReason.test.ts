import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveCustomerUploadAttachDisabledReason } from "./resolveCustomerUploadAttachDisabledReason";

const base = {
  isDonation: false,
  readyCount: 1,
  ownershipConfirmed: true,
  catalogUseAcknowledged: true,
  isProcessing: false,
  isAttaching: false,
  isRequestFull: false,
  canAddPrints: true,
  exhaustedStatusText: null,
  maxImagesForRequest: 25,
} as const;

describe("resolveCustomerUploadAttachDisabledReason", () => {
  it("returns null when attach is allowed", () => {
    assert.equal(resolveCustomerUploadAttachDisabledReason(base), null);
  });

  it("requires ownership even when ready and within request room", () => {
    assert.equal(
      resolveCustomerUploadAttachDisabledReason({
        ...base,
        ownershipConfirmed: false,
      }),
      "Confirm you own this artwork or have permission to print it.",
    );
  });

  it("requires donation listing consent after ownership", () => {
    assert.equal(
      resolveCustomerUploadAttachDisabledReason({
        ...base,
        isDonation: true,
        ownershipConfirmed: true,
        catalogUseAcknowledged: false,
        maxImagesForRequest: null,
      }),
      "Confirm you understand these images are donated to the design library.",
    );
  });

  it("surfaces request-full before ownership", () => {
    assert.equal(
      resolveCustomerUploadAttachDisabledReason({
        ...base,
        ownershipConfirmed: false,
        isRequestFull: true,
        canAddPrints: false,
        exhaustedStatusText: "This request is full (25/25).",
      }),
      "This request is full (25/25).",
    );
  });

  it("does not claim full while quota is still hydrating", () => {
    assert.equal(
      resolveCustomerUploadAttachDisabledReason({
        ...base,
        isQuotaReady: false,
        canAddPrints: false,
      }),
      "Checking print limits…",
    );
  });

  it("surfaces too many ready images vs remaining slots", () => {
    assert.equal(
      resolveCustomerUploadAttachDisabledReason({
        ...base,
        readyCount: 3,
        maxImagesForRequest: 2,
      }),
      "Only 2 print slots left on this request. Remove images or lower quantities first.",
    );
  });
});
