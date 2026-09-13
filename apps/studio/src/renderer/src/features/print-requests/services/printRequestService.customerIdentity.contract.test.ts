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
});
