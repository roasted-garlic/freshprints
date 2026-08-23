import assert from "node:assert/strict";
import test from "node:test";

import { catalogSearchTokensMatch, normalizeCatalogSearchToken } from "./catalogSearchNormalization";

test("normalizeCatalogSearchToken is case-insensitive", () => {
  assert.equal(normalizeCatalogSearchToken("Mindful"), "mindful");
  assert.equal(normalizeCatalogSearchToken("MINDFUL"), "mindful");
});

test("normalizeCatalogSearchToken collapses separators", () => {
  assert.equal(normalizeCatalogSearchToken("butt hole"), "butthole");
  assert.equal(normalizeCatalogSearchToken("butt-hole"), "butthole");
  assert.equal(normalizeCatalogSearchToken("butt_hole"), "butthole");
});

test("catalogSearchTokensMatch finds mindful in mixed-case title", () => {
  assert.equal(catalogSearchTokensMatch("Be Mindful Grateful", "mindful"), true);
  assert.equal(catalogSearchTokensMatch("Mindful", "mindful"), true);
});

test("catalogSearchTokensMatch links separated and joined tokens", () => {
  assert.equal(catalogSearchTokensMatch("butthole", "butt hole"), true);
  assert.equal(catalogSearchTokensMatch("butt hole", "butthole"), true);
});

test("catalogSearchTokensMatch does not fuzzy-match unrelated words", () => {
  assert.equal(catalogSearchTokensMatch("will", "kill"), false);
  assert.equal(catalogSearchTokensMatch("skill", "kill"), true);
});
