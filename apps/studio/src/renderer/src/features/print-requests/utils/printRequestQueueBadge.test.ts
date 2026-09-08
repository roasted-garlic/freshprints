import assert from "node:assert/strict";
import test from "node:test";

import { shouldShowPrintRequestQueueStateBadge } from "./printRequestQueueBadge";

test("shouldShowPrintRequestQueueStateBadge hides Working pill for archived requests", () => {
  assert.equal(shouldShowPrintRequestQueueStateBadge("archived"), false);
  assert.equal(shouldShowPrintRequestQueueStateBadge("active"), true);
  assert.equal(shouldShowPrintRequestQueueStateBadge("editing"), true);
  assert.equal(shouldShowPrintRequestQueueStateBadge("completed"), true);
  assert.equal(shouldShowPrintRequestQueueStateBadge("draft"), true);
});
