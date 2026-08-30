import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  formatCustomerIdentityLabel,
  formatCustomerUsernameIdentityLabel,
} from "./formatCustomerIdentityLabel.ts";

describe("formatCustomerUsernameIdentityLabel", () => {
  it("formats current username with @ prefix", () => {
    assert.equal(
      formatCustomerUsernameIdentityLabel({ currentUsername: "newname" }),
      "@newname",
    );
  });

  it("does not show was text when current and at-creation match", () => {
    assert.equal(
      formatCustomerUsernameIdentityLabel({
        currentUsername: "newname",
        usernameAtCreation: "newname",
      }),
      "@newname",
    );
  });

  it("shows historical mismatch copy", () => {
    assert.equal(
      formatCustomerUsernameIdentityLabel({
        currentUsername: "newname",
        usernameAtCreation: "oldname",
      }),
      "@newname · was @oldname at submission",
    );
  });

  it("treats missing at-creation as current-only for legacy records", () => {
    assert.equal(
      formatCustomerUsernameIdentityLabel({
        currentUsername: "legacyuser",
      }),
      "@legacyuser",
    );
  });
});

describe("formatCustomerIdentityLabel", () => {
  it("includes display name when present", () => {
    assert.equal(
      formatCustomerIdentityLabel({
        currentDisplayName: "Alex",
        currentUsername: "newname",
        usernameAtCreation: "oldname",
      }),
      "Alex (@newname · was @oldname at submission)",
    );
  });
});
