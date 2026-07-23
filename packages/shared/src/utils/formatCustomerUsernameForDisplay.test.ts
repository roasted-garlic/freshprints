import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatCustomerUsernameForDisplay } from "./formatCustomerUsernameForDisplay.ts";

describe("formatCustomerUsernameForDisplay", () => {
  it("returns username unchanged when not deleted", () => {
    assert.equal(formatCustomerUsernameForDisplay("freshprints"), "freshprints");
  });

  it("appends (Deleted) only for display when tombstoned", () => {
    assert.equal(
      formatCustomerUsernameForDisplay("freshprints", { isDeleted: true }),
      "freshprints (Deleted)",
    );
  });

  it("does not mutate empty username into a reusable handle", () => {
    assert.equal(formatCustomerUsernameForDisplay("", { isDeleted: true }), "(Deleted)");
    assert.equal(formatCustomerUsernameForDisplay(undefined), "Unknown customer");
  });
});
