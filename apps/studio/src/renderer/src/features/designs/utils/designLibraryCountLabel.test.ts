import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  resolveDesignLibraryCountLabel,
  resolveDesignLibraryCountLabelMode,
} from "./designLibraryCountLabel.ts";

describe("designLibraryCountLabel", () => {
  it("shows aggregate library total for unfiltered browse", () => {
    assert.equal(
      resolveDesignLibraryCountLabel({
        mode: "browse-unfiltered",
        libraryTotal: 250,
        managedTotal: null,
        loadedMatchingCount: 100,
      }),
      "250 designs",
    );
  });

  it("does not present library total as filtered when client filters are page-local", () => {
    assert.equal(
      resolveDesignLibraryCountLabel({
        mode: "browse-client-filtered",
        libraryTotal: 250,
        managedTotal: null,
        loadedMatchingCount: 12,
      }),
      "12 matching (loaded)",
    );
  });

  it("uses Algolia nbHits wording for managed search", () => {
    assert.equal(
      resolveDesignLibraryCountLabel({
        mode: "managed-search",
        libraryTotal: 250,
        managedTotal: 3,
        loadedMatchingCount: 3,
      }),
      "3 results",
    );
  });

  it("fail-closed managed unavailable label", () => {
    assert.equal(
      resolveDesignLibraryCountLabelMode({
        managedSearchActive: true,
        managedSearchUnavailable: true,
        needsCompanionFilter: false,
        hasClientCategoryOrTags: false,
        hasClientPageLocalSearch: false,
        includeArchived: false,
      }),
      "managed-unavailable",
    );
  });

  it("archived client search uses matching (loaded) not library total", () => {
    assert.equal(
      resolveDesignLibraryCountLabelMode({
        managedSearchActive: false,
        managedSearchUnavailable: false,
        needsCompanionFilter: false,
        hasClientCategoryOrTags: false,
        hasClientPageLocalSearch: true,
        includeArchived: true,
      }),
      "browse-client-filtered",
    );
  });
});
