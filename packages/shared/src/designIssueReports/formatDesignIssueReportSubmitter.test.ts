import assert from "node:assert/strict";
import test from "node:test";
import { formatDesignIssueReportSubmitter } from "./formatDesignIssueReportSubmitter";

test("prefers display name, then username, then Anonymous", () => {
  assert.equal(formatDesignIssueReportSubmitter({ customerDisplayNameSnapshot: "Alex", customerUsernameSnapshot: "alex" }), "Alex");
  assert.equal(formatDesignIssueReportSubmitter({ customerDisplayNameSnapshot: "  ", customerUsernameSnapshot: "alex" }), "alex");
  assert.equal(formatDesignIssueReportSubmitter({ customerDisplayNameSnapshot: "", customerUsernameSnapshot: "" }), "Anonymous");
  assert.equal(formatDesignIssueReportSubmitter({}), "Anonymous");
});
