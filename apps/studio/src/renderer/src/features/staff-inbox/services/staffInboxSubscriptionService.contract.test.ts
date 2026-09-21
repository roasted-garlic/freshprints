import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const serviceSource = readFileSync(new URL("./staffInboxSubscriptionService.ts", import.meta.url), "utf8");

describe("staffInboxSubscriptionService pagination contract", () => {
  it("uses authoritative timestamp and document-id ordering with a page sentinel", () => {
    assert.match(serviceSource, /orderBy\(source\.orderField, "desc"\)/);
    assert.match(serviceSource, /orderBy\("__name__", "desc"\)/);
    assert.match(serviceSource, /startAfter\(cursor\)/);
    assert.match(serviceSource, /limit\(source\.pageSize \+ 1\)/);
    assert.match(serviceSource, /querySnapshot\.docs\.length > source\.pageSize/);
  });

  it("keeps cumulative source maps and fixed page cursors across live emissions", () => {
    assert.match(serviceSource, /records: Map<string, T>/);
    assert.match(serviceSource, /source\.records = mapSourceRecords\(source\)/);
    assert.match(serviceSource, /The cursor is the consumed boundary/);
    assert.match(serviceSource, /Live updates reconcile the page contents but never move that boundary/);
    assert.match(serviceSource, /page\.docs = pageState\.records/);
    assert.match(serviceSource, /reconcileSourcePageEvictions/);
    assert.match(serviceSource, /where\(documentId\(\), "in", chunk\)/);
  });

  it("hydrates allocation-referenced requests in bounded document-id chunks", () => {
    assert.match(serviceSource, /REQUEST_HYDRATION_CHUNK_SIZE = 30/);
    assert.match(serviceSource, /where\(documentId\(\), "in", chunk\)/);
    assert.match(serviceSource, /allocationSource\.records\.values\(\)/);
    assert.match(serviceSource, /requestSource\.hydratedRecords\.set\(document\.id, mapped\)/);
  });
});
