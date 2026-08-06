import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { resolveReadyOrderMillis, sortDesignsByReadyTransition } from "./readyOrder";

function read(p: string): string {
  return readFileSync(p, "utf8");
}

function ts(millis: number) {
  return { toMillis: () => millis };
}

/**
 * Owner QA Amendment 3: default catalog ordering is the most recent transition into
 * `status: "ready"` (`readyAt`), not `createdAt` or `updatedAt`.
 */
describe("resolveReadyOrderMillis", () => {
  it("prefers readyAt over createdAt", () => {
    assert.equal(
      resolveReadyOrderMillis({ id: "a", readyAt: ts(2_000), createdAt: ts(1_000) }),
      2_000,
    );
  });

  it("falls back to createdAt for legacy designs approved before readyAt existed", () => {
    assert.equal(resolveReadyOrderMillis({ id: "a", createdAt: ts(1_000) }), 1_000);
  });

  it("returns undefined when neither timestamp is resolvable", () => {
    assert.equal(resolveReadyOrderMillis({ id: "a" }), undefined);
  });
});

describe("sortDesignsByReadyTransition", () => {
  it("puts a newly approved design first even when it was created earliest", () => {
    const older = { id: "older", createdAt: ts(1_000), readyAt: ts(9_000) };
    const newer = { id: "newer", createdAt: ts(5_000), readyAt: ts(6_000) };

    assert.deepEqual(
      sortDesignsByReadyTransition([newer, older]).map((d) => d.id),
      ["older", "newer"],
      "most recent ready transition wins regardless of creation order",
    );
  });

  it("moves a reprocessed-and-reapproved design back to first", () => {
    const a = { id: "a", createdAt: ts(1_000), readyAt: ts(2_000) };
    const b = { id: "b", createdAt: ts(3_000), readyAt: ts(4_000) };
    assert.deepEqual(sortDesignsByReadyTransition([a, b]).map((d) => d.id), ["b", "a"]);

    // `a` is reprocessed and reapproved -> new readyAt, so it becomes first.
    const reapprovedA = { ...a, readyAt: ts(9_000) };
    assert.deepEqual(
      sortDesignsByReadyTransition([reapprovedA, b]).map((d) => d.id),
      ["a", "b"],
    );
  });

  it("mixes legacy (createdAt fallback) and readyAt designs on one timeline", () => {
    const legacy = { id: "legacy", createdAt: ts(5_000) };
    const modern = { id: "modern", createdAt: ts(1_000), readyAt: ts(7_000) };
    const olderModern = { id: "olderModern", createdAt: ts(1_000), readyAt: ts(3_000) };

    assert.deepEqual(
      sortDesignsByReadyTransition([olderModern, legacy, modern]).map((d) => d.id),
      ["modern", "legacy", "olderModern"],
      "legacy designs stay visible and interleave by their createdAt fallback",
    );
  });

  it("breaks ties deterministically by design ID", () => {
    const a = { id: "aaa", readyAt: ts(5_000) };
    const b = { id: "bbb", readyAt: ts(5_000) };

    assert.deepEqual(sortDesignsByReadyTransition([a, b]).map((d) => d.id), ["bbb", "aaa"]);
    assert.deepEqual(sortDesignsByReadyTransition([b, a]).map((d) => d.id), ["bbb", "aaa"]);
  });

  it("sorts designs with no resolvable timestamp last", () => {
    const none = { id: "none" };
    const dated = { id: "dated", readyAt: ts(1_000) };
    assert.deepEqual(sortDesignsByReadyTransition([none, dated]).map((d) => d.id), ["dated", "none"]);
  });
});

describe("readyAt write semantics (Amendment 3)", () => {
  const designService = read(
    "apps/studio/src/renderer/src/features/designs/services/designService.ts",
  );

  it("stamps readyAt only when the write transitions the design into ready", () => {
    assert.match(designService, /if \(input\.status === "ready"\) \{\s*\n\s*updatePayload\.readyAt = serverTimestamp\(\);/);
  });

  it("does not write readyAt from any metadata-edit path", () => {
    // The only assignment in the whole service must be the ready-transition one above.
    assert.equal((designService.match(/updatePayload\.readyAt/g) ?? []).length, 1);
    assert.equal((designService.match(/readyAt: serverTimestamp\(\)/g) ?? []).length, 0);
  });

  it("maps readyAt back off the document", () => {
    assert.match(designService, /readyAt: mapFirestoreTimestamp\(data\.readyAt\)/);
  });
});

describe("ordering consumers use the same key (Amendment 3)", () => {
  it("Studio Design Library orders normal browse by ready transition at the query level", () => {
    // Owner QA Amendment 3 correction: this is a server-side orderBy, not a page-local sort —
    // see readyOrderPagination.test.ts for the failing-before/passing-after proof.
    const filters = read(
      "apps/studio/src/renderer/src/features/designs/constants/designLibraryFilters.ts",
    );
    assert.match(
      filters,
      /export const DESIGN_LIBRARY_DEFAULT_SORT_FIELD: DesignListSortField = "readyAt";/,
    );
  });

  it("Portal default browse uses readyAt orderBy with createdAt fallback for legacy", () => {
    const portalService = read("apps/portal/features/catalog/services/catalogService.ts");
    assert.match(portalService, /return listQuery\.sortField \?\? 'readyAt'/);
    assert.match(portalService, /case 'readyAt':\s*\n\s*return design\.readyAtMs \?\? design\.createdAtMs \?\? 0/);
    assert.match(portalService, /readyAtMs: timestampToMillis\(data\.readyAt\)/);

    const builders = read("functions/src/catalogSnapshots/snapshotBuilders.ts");
    assert.match(builders, /card\.readyAtMs \?\? card\.createdAtMs \?\? 0/);
    assert.match(builders, /readyAtMs: millis\(data\.readyAt\)/);
  });

  it("metric collections (Popular / Recently Requested) keep their own ordering", () => {
    const publisher = read("functions/src/catalogSnapshots/publishCatalogSnapshots.ts");
    // The metric-ranked discover list still ranks by request+favorite counts.
    assert.match(
      publisher,
      /\(right\.requestCount \+ right\.favoriteCount\) - \(left\.requestCount \+ left\.favoriteCount\)/,
    );
  });

  it("a readyAt change republishes the generated browse order", () => {
    const classifier = read("functions/src/catalogSnapshots/portalCatalogChangeClassifier.ts");
    const indexFilterBlock = classifier.slice(
      classifier.indexOf("const INDEX_FILTER_FIELDS"),
      classifier.indexOf("const CARD_ONLY_FIELDS"),
    );
    assert.match(indexFilterBlock, /"readyAt"/);
  });
});
