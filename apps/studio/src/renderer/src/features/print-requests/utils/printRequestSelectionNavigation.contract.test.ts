import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const here = dirname(fileURLToPath(import.meta.url));
const pageSource = readFileSync(join(here, "../pages/PrintRequestsPage.tsx"), "utf8");
const detailsSource = readFileSync(join(here, "../hooks/usePrintRequestDetails.ts"), "utf8");

test("Print Requests keeps a second rail selection from canonicalizing stale detail state", () => {
  assert.match(
    pageSource,
    /requestDetails\.loadedRequestId === selectedRequestId[\s\S]*requestDetails\.printRequest\.id === selectedRequestId/,
  );
  assert.match(
    pageSource,
    /requestDetails\.isLoading \|\| !isLoadedSelectedRequest[\s\S]*!requestDetails\.error/,
  );
  assert.match(pageSource, /onClick=\{\(\) => selectPrintRequestFromRail\(request\.id\)\}/);
});

test("Print Request detail hydration clears the prior request before subscribing to a new ID", () => {
  assert.match(
    detailsSource,
    /setState\(\{[\s\S]*printRequest: null,[\s\S]*items: \[\],[\s\S]*uploadSummaries: new Map\(\),[\s\S]*staffArtworkSummaries: new Map\(\),[\s\S]*loadedRequestId: printRequestId,/,
  );
});
