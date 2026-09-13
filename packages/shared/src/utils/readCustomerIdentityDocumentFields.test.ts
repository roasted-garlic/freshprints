import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { readCustomerIdentityDocumentFields } from "./readCustomerIdentityDocumentFields";

describe("readCustomerIdentityDocumentFields", () => {
  it("maps WS1 identity fields from customer document payloads", () => {
    const fields = readCustomerIdentityDocumentFields({
      isDisabled: true,
      disabledAt: { seconds: 1 },
      disabledBy: "owner-1",
      disabledReason: "QA hold",
      isDeleted: false,
      isMerged: true,
      mergedIntoCustomerId: "cust-target",
    });

    assert.equal(fields.isDisabled, true);
    assert.equal(fields.disabledBy, "owner-1");
    assert.equal(fields.disabledReason, "QA hold");
    assert.equal(fields.isDeleted, undefined);
    assert.equal(fields.isMerged, true);
    assert.equal(fields.mergedIntoCustomerId, "cust-target");
  });
});
