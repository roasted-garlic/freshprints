import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatDesignIssueReportSubmitter } from "./formatDesignIssueReportSubmitter";

describe("formatDesignIssueReportSubmitter", () => {
  it("prefers display name with username identity label", () => {
    assert.equal(
      formatDesignIssueReportSubmitter({
        customerDisplayNameSnapshot: "Alex",
        customerUsernameSnapshot: "alex",
      }),
      "Alex (@alex)",
    );
  });

  it("falls back to username identity label", () => {
    assert.equal(
      formatDesignIssueReportSubmitter({
        customerDisplayNameSnapshot: "  ",
        customerUsernameSnapshot: "alex",
      }),
      "@alex",
    );
  });

  it("falls back to Anonymous when identity is missing", () => {
    assert.equal(
      formatDesignIssueReportSubmitter({
        customerDisplayNameSnapshot: "",
        customerUsernameSnapshot: "",
      }),
      "Anonymous",
    );
    assert.equal(formatDesignIssueReportSubmitter({}), "Anonymous");
  });

  it("shows historical username mismatch", () => {
    assert.equal(
      formatDesignIssueReportSubmitter({
        customerUsernameSnapshot: "newname",
        customerUsernameAtCreationSnapshot: "oldname",
      }),
      "@newname · was @oldname at submission",
    );
  });
});
