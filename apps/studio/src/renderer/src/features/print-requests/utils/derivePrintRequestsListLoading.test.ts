import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { derivePrintRequestsListLoading } from "./derivePrintRequestsListLoading";

describe("derivePrintRequestsListLoading", () => {
  it("reports loading on initial mount, before any tab has ever completed a load", () => {
    assert.equal(derivePrintRequestsListLoading(true, null, "working"), true);
  });

  it("reports not loading once state.isLoading is false and the loaded tab matches the active tab", () => {
    assert.equal(derivePrintRequestsListLoading(false, "working", "working"), false);
  });

  it("reports loading during the transitional render: activeTab changed but state.isLoading has not yet flipped true (Queued -> Working stale-list regression)", () => {
    // The exact reported defect: Queued finished loading (state.isLoading: false, loadedTab:
    // "queued"), the user clicks Working, and activeTab becomes "working" on this render — but
    // loadFirstPage's own reset runs inside a useEffect that has not fired yet, so
    // state.isLoading is still false. Without comparing against loadedTab, this render would
    // incorrectly report "not loading" while state.requests still holds Queued's stale page.
    assert.equal(derivePrintRequestsListLoading(false, "queued", "working"), true);
  });

  it("reports loading while state.isLoading is genuinely true, regardless of loadedTab", () => {
    assert.equal(derivePrintRequestsListLoading(true, "working", "working"), true);
  });

  it("reports not loading once the new tab's load completes and loadedTab catches up", () => {
    assert.equal(derivePrintRequestsListLoading(false, "working", "working"), false);
  });

  it("reports loading for every tab during rapid switching until the last-requested tab's load completes", () => {
    // Simulates Queued -> Printing -> Working switched faster than any load resolves; only the
    // final settled loadedTab should ever report not-loading.
    assert.equal(derivePrintRequestsListLoading(false, "queued", "printing"), true);
    assert.equal(derivePrintRequestsListLoading(false, "queued", "working"), true);
    assert.equal(derivePrintRequestsListLoading(false, "working", "working"), false);
  });
});
