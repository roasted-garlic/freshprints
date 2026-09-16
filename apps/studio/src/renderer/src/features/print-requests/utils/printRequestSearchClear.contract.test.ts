import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const page = readFileSync(
  new URL("../pages/PrintRequestsPage.tsx", import.meta.url),
  "utf8",
);
const css = readFileSync(
  new URL("../../../styles/components/print-requests.css", import.meta.url),
  "utf8",
);

describe("Print Requests search clear control", () => {
  it("renders the clear control only for non-empty search and refocuses the input", () => {
    assert.match(page, /listSearchQuery \? \(/);
    assert.match(page, /aria-label="Clear print request search"/);
    assert.match(page, /setListSearchQuery\(""\)/);
    assert.match(page, /listSearchInputRef\.current\?\.focus\(\)/);
    assert.match(page, /onMouseDown=\{\(event\) => event\.preventDefault\(\)\}/);
  });

  it("keeps the existing search, isolation, lifecycle, and grouping state seams", () => {
    assert.match(page, /setIsolatedShowId/);
    assert.match(page, /activeListTab === "queued"/);
    assert.match(page, /groupPrintRequestsByCustomerWithinShow/);
    assert.match(css, /\.print-requests-rail-search-clear/);
  });
});
