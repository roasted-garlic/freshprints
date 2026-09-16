import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const here = dirname(fileURLToPath(import.meta.url));
const serviceSource = readFileSync(join(here, "../services/printRequestService.ts"), "utf8");
const hookSource = readFileSync(join(here, "usePrintRequestDetails.ts"), "utf8");

test("Studio printRequestService exposes request-scoped live subscriptions", () => {
  assert.match(serviceSource, /subscribePrintRequest\(/);
  assert.match(serviceSource, /subscribePrintRequestItems\(/);
  assert.match(serviceSource, /createSharedFirestoreSubscription/);
  assert.match(serviceSource, /source: "printRequestService\.subscribePrintRequest"/);
  assert.match(serviceSource, /source: "printRequestService\.subscribePrintRequestItems"/);
  assert.match(serviceSource, /doc\(firestoreCollectionService\.getPrintRequestsCollection\(\), printRequestId\)/);
  assert.match(serviceSource, /printRequestId == \$\{printRequestId\}/);
});

test("usePrintRequestDetails attaches and tears down selected-request listeners", () => {
  assert.match(hookSource, /subscribePrintRequest\(/);
  assert.match(hookSource, /subscribePrintRequestItems\(/);
  assert.match(hookSource, /unsubscribeRequest\(\)/);
  assert.match(hookSource, /unsubscribeItems\(\)/);
  assert.match(hookSource, /return \(\) => \{\s*unsubscribeRequest\(\);\s*unsubscribeItems\(\);/);
});
