import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DESIGN_LIBRARY_DEFAULT_SORT_DIRECTION,
  DESIGN_LIBRARY_DEFAULT_SORT_FIELD,
  DESIGN_LIBRARY_NEEDS_COMPANION_QUERY_PARAM,
  buildCatalogDesignListQuery,
  buildDesignLibrarySearchParams,
  parseDesignLibraryUrlFilters,
} from "./designLibraryFilters";

describe("buildCatalogDesignListQuery", () => {
  // Owner QA Amendment 3 correction: normal browse orders server-side by the most recent
  // transition into `ready` (readyAt), so a design reapproved today surfaces first even when it
  // was created long ago and would fall outside a createdAt-ordered page.
  it("defaults Design Library sort to readyAt descending (most recent ready transition first)", () => {
    const query = buildCatalogDesignListQuery({
      archived: false,
      tags: [],
    });

    assert.equal(query.sortField, "readyAt");
    assert.equal(query.sortDirection, "desc");
    assert.equal(query.sortField, DESIGN_LIBRARY_DEFAULT_SORT_FIELD);
    assert.equal(query.sortDirection, DESIGN_LIBRARY_DEFAULT_SORT_DIRECTION);
    assert.deepEqual(query.statusIn, ["ready"]);
  });

  it("keeps createdAt desc for archived catalog scope", () => {
    const query = buildCatalogDesignListQuery({
      archived: true,
      categoryId: "cat-1",
      tags: ["summer"],
    });

    assert.equal(query.sortField, "createdAt");
    assert.equal(query.sortDirection, "desc");
    assert.equal(query.categoryId, "cat-1");
    assert.equal(query.tag, "summer");
    assert.deepEqual(query.statusIn, ["archived"]);
    assert.equal(query.companionSetIncomplete, undefined);
  });

  it("adds companionSetIncomplete only when requested for Needs Companion Firestore browse", () => {
    const withCompanion = buildCatalogDesignListQuery({
      archived: false,
      companionSetIncomplete: true,
      tags: [],
    });
    assert.equal(withCompanion.companionSetIncomplete, true);
    assert.deepEqual(withCompanion.statusIn, ["ready"]);
    // Intended Companion browse ordering matches ready Design Library (readyAt), not createdAt.
    assert.equal(withCompanion.sortField, "readyAt");

    const without = buildCatalogDesignListQuery({
      archived: false,
      companionSetIncomplete: false,
      tags: [],
    });
    assert.equal(without.companionSetIncomplete, undefined);
  });
});

describe("needsCompanion URL filter", () => {
  it("defaults to false when the param is absent", () => {
    const filters = parseDesignLibraryUrlFilters(new URLSearchParams());
    assert.equal(filters.needsCompanion, false);
  });

  it("parses true/1/yes values as on", () => {
    for (const value of ["true", "1", "yes"]) {
      const filters = parseDesignLibraryUrlFilters(
        new URLSearchParams({ [DESIGN_LIBRARY_NEEDS_COMPANION_QUERY_PARAM]: value }),
      );
      assert.equal(filters.needsCompanion, true, `expected "${value}" to parse as true`);
    }
  });

  it("round-trips through buildDesignLibrarySearchParams", () => {
    const params = buildDesignLibrarySearchParams({ needsCompanion: true });
    assert.equal(params.get(DESIGN_LIBRARY_NEEDS_COMPANION_QUERY_PARAM), "true");

    const offParams = buildDesignLibrarySearchParams({ needsCompanion: false });
    assert.equal(offParams.has(DESIGN_LIBRARY_NEEDS_COMPANION_QUERY_PARAM), false);
  });
});
