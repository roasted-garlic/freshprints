import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  STAFF_INBOX_VISIBLE_PAGE_SIZE,
  advanceVisibleCount,
  canRevealMoreVisible,
  clampVisibleCount,
  initialVisibleCount,
} from "./staffInboxVisiblePagination";

describe("staffInboxVisiblePagination", () => {
  it("starts at 10 alerts per page", () => {
    assert.equal(STAFF_INBOX_VISIBLE_PAGE_SIZE, 10);
    assert.equal(initialVisibleCount(), 10);
  });

  it("advances by one page without exceeding the loaded total", () => {
    assert.equal(advanceVisibleCount(10, 25), 20);
    assert.equal(advanceVisibleCount(20, 25), 25);
    assert.equal(advanceVisibleCount(25, 25), 25);
  });

  it("clamps when the loaded list shrinks", () => {
    assert.equal(clampVisibleCount(30, 12), 12);
    assert.equal(clampVisibleCount(10, 3), 3);
    assert.equal(clampVisibleCount(10, 0), 10);
  });

  it("reports when more loaded rows can still be revealed", () => {
    assert.equal(canRevealMoreVisible(10, 11), true);
    assert.equal(canRevealMoreVisible(10, 10), false);
  });
});
