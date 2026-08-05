import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function read(p: string): string {
  return readFileSync(p, "utf8");
}

interface FakeDesign {
  id: string;
  createdAtMs: number;
  readyAtMs: number;
}

const PAGE_SIZE = 3;

/**
 * Simulates the bounded server query: order the whole collection by one field descending with a
 * document-ID descending tiebreaker, then return only the first page.
 */
function fetchBoundedPage(
  all: FakeDesign[],
  sortField: "createdAtMs" | "readyAtMs",
  pageSize = PAGE_SIZE,
): FakeDesign[] {
  return [...all]
    .sort((left, right) => right[sortField] - left[sortField] || right.id.localeCompare(left.id))
    .slice(0, pageSize);
}

/**
 * Owner QA Amendment 3 correction: Studio previously fetched a bounded page ordered by
 * `createdAt` and then sorted only that page by `readyAt`. An old design reapproved today sits
 * outside the fetched `createdAt` page, so no amount of page-local sorting can surface it.
 */
describe("ready-transition ordering must be a server orderBy, not a page-local sort", () => {
  // 5 designs; the oldest (design-a) is reapproved today. Page size is 3.
  const designs: FakeDesign[] = [
    { id: "design-a", createdAtMs: 1_000, readyAtMs: 9_000 }, // oldest, reapproved today
    { id: "design-b", createdAtMs: 2_000, readyAtMs: 2_100 },
    { id: "design-c", createdAtMs: 3_000, readyAtMs: 3_100 },
    { id: "design-d", createdAtMs: 4_000, readyAtMs: 4_100 },
    { id: "design-e", createdAtMs: 5_000, readyAtMs: 5_100 },
  ];

  it("failing-before: a createdAt-ordered page excludes the reapproved design entirely", () => {
    const page = fetchBoundedPage(designs, "createdAtMs");

    assert.deepEqual(page.map((d) => d.id), ["design-e", "design-d", "design-c"]);
    assert.ok(
      !page.some((d) => d.id === "design-a"),
      "design-a is outside the createdAt page — this is why page-local sorting could never fix it",
    );

    // Sorting that page by readyAt still cannot produce design-a.
    const locallySorted = [...page].sort((l, r) => r.readyAtMs - l.readyAtMs);
    assert.notEqual(locallySorted[0]?.id, "design-a");
  });

  it("passing-after: a readyAt-ordered page puts the reapproved design first", () => {
    const page = fetchBoundedPage(designs, "readyAtMs");

    assert.equal(
      page[0]?.id,
      "design-a",
      "the design whose ready transition is most recent must be the first Studio result",
    );
    assert.deepEqual(page.map((d) => d.id), ["design-a", "design-e", "design-d"]);
  });

  it("keeps deterministic document-ID descending tie-breaking on equal timestamps", () => {
    const tied: FakeDesign[] = [
      { id: "aaa", createdAtMs: 1, readyAtMs: 5_000 },
      { id: "bbb", createdAtMs: 2, readyAtMs: 5_000 },
      { id: "ccc", createdAtMs: 3, readyAtMs: 5_000 },
    ];

    assert.deepEqual(fetchBoundedPage(tied, "readyAtMs").map((d) => d.id), ["ccc", "bbb", "aaa"]);
    assert.deepEqual(
      fetchBoundedPage([...tied].reverse(), "readyAtMs").map((d) => d.id),
      ["ccc", "bbb", "aaa"],
      "ordering is stable regardless of input order",
    );
  });

  it("paginates by ready transition without gaps or repeats across pages", () => {
    const ordered = [...designs].sort(
      (l, r) => r.readyAtMs - l.readyAtMs || r.id.localeCompare(l.id),
    );
    const firstPage = ordered.slice(0, PAGE_SIZE);
    const secondPage = ordered.slice(PAGE_SIZE);

    assert.deepEqual(firstPage.map((d) => d.id), ["design-a", "design-e", "design-d"]);
    assert.deepEqual(secondPage.map((d) => d.id), ["design-c", "design-b"]);

    const seen = new Set([...firstPage, ...secondPage].map((d) => d.id));
    assert.equal(seen.size, designs.length, "every design appears exactly once across pages");
  });
});

describe("Studio query wiring (Amendment 3 correction)", () => {
  it("Design Library normal browse asks the server for readyAt ordering", () => {
    const filters = read(
      "apps/studio/src/renderer/src/features/designs/constants/designLibraryFilters.ts",
    );

    assert.match(
      filters,
      /export const DESIGN_LIBRARY_DEFAULT_SORT_FIELD: DesignListSortField = "readyAt";/,
    );
    // Archived browse must stay on createdAt: readyAt is only written on the ready transition.
    assert.match(
      filters,
      /export const DESIGN_LIBRARY_ARCHIVED_SORT_FIELD: DesignListSortField = "createdAt";/,
    );
    assert.match(filters, /sortField: options\.archived\s*\n?\s*\? DESIGN_LIBRARY_ARCHIVED_SORT_FIELD/);
  });

  it("the page no longer re-sorts results locally", () => {
    const page = read("apps/studio/src/renderer/src/features/designs/pages/DesignLibraryPage.tsx");
    assert.doesNotMatch(page, /sortReadyDesigns/);
  });

  it("cursor values resolve readyAt (with a legacy createdAt fallback) so pagination stays aligned", () => {
    const service = read(
      "apps/studio/src/renderer/src/features/designs/services/designService.ts",
    );
    assert.match(service, /if \(sortField === "readyAt"\)/);
    assert.match(service, /\(design\.readyAt \?\? design\.createdAt\)\.toMillis\(\)/);
  });

  it("never hides legacy ready designs before the backfill has run", () => {
    const service = read(
      "apps/studio/src/renderer/src/features/designs/services/designService.ts",
    );
    // Completeness guard: if the ordered query returned fewer than the true matching count,
    // fall back to createdAt ordering rather than silently omitting un-backfilled designs.
    assert.match(service, /matchingCount > page\.designs\.length/);
    assert.match(service, /sortField: "createdAt"/);
  });
});
