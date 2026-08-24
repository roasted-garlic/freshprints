import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CATALOG_SUMMER_SEARCH_PARITY_FIXTURES,
  catalogDesignTextMatchesSearch,
} from "./catalogDesignTextSearch";

describe("catalogDesignTextMatchesSearch", () => {
  it("matches title, description, tags, and optional id", () => {
    assert.equal(
      catalogDesignTextMatchesSearch({ title: "Sunset Wave", tags: ["ocean"] }, "ocean"),
      true,
    );
    assert.equal(
      catalogDesignTextMatchesSearch(
        { title: "Forest", description: "Pine trees", tags: ["nature"] },
        "pine",
      ),
      true,
    );
    assert.equal(
      catalogDesignTextMatchesSearch({ id: "design-summer-001", title: "Wave" }, "summer"),
      true,
    );
    assert.equal(catalogDesignTextMatchesSearch({ title: "Mountain" }, "ocean"), false);
  });

  it("keeps summer progressive substring parity across catalog surfaces", () => {
    for (const fixture of CATALOG_SUMMER_SEARCH_PARITY_FIXTURES) {
      assert.equal(
        catalogDesignTextMatchesSearch({ title: fixture.title }, fixture.query),
        fixture.expect,
        `title=${fixture.title} query=${fixture.query}`,
      );
    }
  });
});
