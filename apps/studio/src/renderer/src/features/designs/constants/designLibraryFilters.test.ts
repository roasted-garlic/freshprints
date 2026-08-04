import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DESIGN_LIBRARY_DEFAULT_SORT_DIRECTION,
  DESIGN_LIBRARY_DEFAULT_SORT_FIELD,
  buildCatalogDesignListQuery,
} from "./designLibraryFilters";

describe("buildCatalogDesignListQuery", () => {
  it("defaults Design Library sort to createdAt descending (newest added first)", () => {
    const query = buildCatalogDesignListQuery({
      archived: false,
      tags: [],
    });

    assert.equal(query.sortField, "createdAt");
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
  });
});
