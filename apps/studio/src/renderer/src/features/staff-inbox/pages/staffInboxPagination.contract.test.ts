import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const pageSource = readFileSync(new URL("./StaffInboxPage.tsx", import.meta.url), "utf8");
const providerSource = readFileSync(
  new URL("../components/StaffInboxProvider.tsx", import.meta.url),
  "utf8",
);
const visiblePaginationSource = readFileSync(
  new URL("../utils/staffInboxVisiblePagination.ts", import.meta.url),
  "utf8",
);

describe("Staff Inbox pagination UI contract", () => {
  it("shows only 10 alerts per tab/section before Load More", () => {
    assert.match(visiblePaginationSource, /STAFF_INBOX_VISIBLE_PAGE_SIZE = 10/);
    assert.match(pageSource, /STAFF_INBOX_VISIBLE_PAGE_SIZE/);
    assert.match(pageSource, /visibleOpenItems/);
    assert.match(pageSource, /visibleDoneDesignReportItems/);
    assert.match(pageSource, /visibleQueueCompletedItems/);
    assert.match(pageSource, /Load more reports/);
    assert.match(pageSource, /Load more completed alerts/);
  });

  it("exposes an accessible, disabled-while-loading Load More control", () => {
    assert.match(pageSource, /role="status"/);
    assert.match(pageSource, /aria-live="polite"/);
    assert.match(pageSource, /aria-busy=\{isLoadingMore\}/);
    assert.match(pageSource, /Showing \{visibleOpenItems\.length\} of \{openItems\.length\}/);
    assert.match(pageSource, /Load more alerts/);
  });

  it("exposes pagination state through the provider context without changing Done state", () => {
    assert.match(providerSource, /setSubscriptionPagination\(state\.pagination\)/);
    assert.match(providerSource, /hasMore: subscriptionPagination\.hasMore/);
    assert.match(providerSource, /isLoadingMore: subscriptionPagination\.isLoadingMore/);
    assert.match(providerSource, /loadMore,/);
    assert.match(providerSource, /completedItems: enrichedCompletedItems/);
  });
});
