import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveExistingCategoryChoice } from "../utils/resolveExistingCategoryChoice";

describe("AI Review category alternative resolution", () => {
  const options = [
    { label: "Animals", value: "cat-animals" },
    { label: "Western & Country", value: "cat-western" },
    { label: "Funny & Sarcastic", value: "cat-funny" },
  ];

  it("17–18. primary and alternatives resolve by id or exact name", () => {
    assert.deepEqual(
      resolveExistingCategoryChoice(
        { categoryId: "cat-animals", categoryName: "Animals" },
        options,
      ),
      options[0],
    );
    assert.deepEqual(
      resolveExistingCategoryChoice({ categoryName: "Western & Country" }, options),
      options[1],
    );
  });

  it("21. unresolved alternative cannot invent a category id", () => {
    assert.equal(
      resolveExistingCategoryChoice(
        { categoryName: "Brand New Category That Does Not Exist" },
        options,
      ),
      null,
    );
    assert.equal(
      resolveExistingCategoryChoice(
        { categoryId: "missing-id", categoryName: "Nope" },
        options,
      ),
      null,
    );
  });
});
