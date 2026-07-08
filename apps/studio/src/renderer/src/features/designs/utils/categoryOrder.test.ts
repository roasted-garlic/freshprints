import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildCategoryOrderUpdates,
  moveCategoryRelative,
  moveCategoryToOrder,
  normalizeCategoryOrder,
} from "./categoryOrder";

function createCategory(id: string, sortOrder: number, name = id.toUpperCase()) {
  return {
    id,
    isActive: true,
    name,
    sortOrder,
  };
}

describe("categoryOrder", () => {
  it("normalizeCategoryOrder reindexes duplicates, gaps, and negative values to contiguous order", () => {
    const categories = [
      createCategory("b", 4, "Beta"),
      createCategory("a", 0, "Alpha"),
      createCategory("d", -1, "Delta"),
      createCategory("c", 4, "Gamma"),
    ];

    const normalized = normalizeCategoryOrder(categories);

    assert.deepEqual(
      normalized.map((category) => ({ id: category.id, sortOrder: category.sortOrder })),
      [
        { id: "a", sortOrder: 0 },
        { id: "b", sortOrder: 1 },
        { id: "c", sortOrder: 2 },
        { id: "d", sortOrder: 3 },
      ],
    );
  });

  it("moveCategoryToOrder moves a category to the requested position and resequences the list", () => {
    const categories = [
      createCategory("a", 0, "Alpha"),
      createCategory("b", 1, "Beta"),
      createCategory("c", 2, "Gamma"),
      createCategory("d", 3, "Delta"),
      createCategory("e", 4, "Epsilon"),
    ];

    const reordered = moveCategoryToOrder(categories, "e", 0);

    assert.deepEqual(
      reordered.map((category) => ({ id: category.id, sortOrder: category.sortOrder })),
      [
        { id: "e", sortOrder: 0 },
        { id: "a", sortOrder: 1 },
        { id: "b", sortOrder: 2 },
        { id: "c", sortOrder: 3 },
        { id: "d", sortOrder: 4 },
      ],
    );
  });

  it("moveCategoryToOrder clamps out-of-range targets to the list bounds", () => {
    const categories = [
      createCategory("a", 0, "Alpha"),
      createCategory("b", 1, "Beta"),
      createCategory("c", 2, "Gamma"),
    ];

    const reordered = moveCategoryToOrder(categories, "a", 99);

    assert.deepEqual(
      reordered.map((category) => category.id),
      ["b", "c", "a"],
    );
  });

  it("moveCategoryRelative supports before and after drop positions", () => {
    const categories = [
      createCategory("a", 0, "Alpha"),
      createCategory("b", 1, "Beta"),
      createCategory("c", 2, "Gamma"),
      createCategory("d", 3, "Delta"),
      createCategory("e", 4, "Epsilon"),
    ];

    const beforeMove = moveCategoryRelative(categories, "c", "e", "before");
    assert.deepEqual(beforeMove.map((category) => category.id), ["a", "b", "d", "c", "e"]);

    const afterMove = moveCategoryRelative(categories, "a", "d", "after");
    assert.deepEqual(afterMove.map((category) => category.id), ["b", "c", "d", "a", "e"]);
  });

  it("buildCategoryOrderUpdates returns only categories whose order changed", () => {
    const previousCategories = [
      createCategory("a", 0, "Alpha"),
      createCategory("b", 1, "Beta"),
      createCategory("c", 2, "Gamma"),
    ];
    const nextCategories = moveCategoryToOrder(previousCategories, "c", 0);

    assert.deepEqual(buildCategoryOrderUpdates(previousCategories, nextCategories), [
      { id: "c", sortOrder: 0 },
      { id: "a", sortOrder: 1 },
      { id: "b", sortOrder: 2 },
    ]);
  });
});
