import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const here = path.dirname(fileURLToPath(import.meta.url));

test("printRequestService checks continuable requests before transaction", () => {
  const source = readFileSync(path.join(here, "printRequestService.ts"), "utf8");
  assert.match(source, /assertCustomerHasNoContinuablePrintRequest/);
  assert.match(source, /await assertCustomerHasNoContinuablePrintRequest\(input\.customerId\)/);
  assert.doesNotMatch(
    source,
    /createCustomerPrintRequestInTransaction[\s\S]*?transaction\.get\(\s*query\(/,
  );
  assert.match(source, /createStudioCustomerPrintRequest/);
});

test("Studio customer request creation uses the server callable as the race-safety boundary", () => {
  const source = readFileSync(
    path.resolve(here, "../../../../../../../../functions/src/createStudioCustomerPrintRequest.ts"),
    "utf8",
  );
  assert.match(source, /adminDb\.runTransaction/);
  assert.match(source, /where\("customerId", "==", input\.customerId\)/);
  assert.match(source, /where\("status", "in", \["draft", "editing"\]\)/);
  assert.match(source, /isPortalParkedDraft/);
  assert.match(source, /requestOrigin: "studio_customer"/);
});

test("printRequestService maps customer identity fields for request-creation picker filtering", () => {
  const source = readFileSync(path.join(here, "printRequestService.ts"), "utf8");
  assert.match(source, /readCustomerIdentityDocumentFields/);
  assert.match(source, /\.\.\.identityRest/);
});

test("PrintRequestsPage filters inactive customers from new request picker", () => {
  const source = readFileSync(
    path.join(here, "..", "pages", "PrintRequestsPage.tsx"),
    "utf8",
  );
  assert.match(source, /isActiveCustomerAccount/);
  assert.match(source, /customerDirectory[\s\S]*customerIdsWithContinuableRequest[\s\S]*searchText/);
  assert.match(source, /searchable/);
  assert.match(source, /Clear customer search/);
  assert.match(source, /No eligible customers match this search/);
  assert.match(source, /User Account/);
  assert.match(source, /print-requests-detail-user-account-link/);
  assert.match(source, /\/users\?customerId=\$\{encodeURIComponent/);
  assert.match(source, /ExternalLink/);
});
