import assert from "node:assert/strict";
import test from "node:test";

import { filterSelectOptionsByLabel } from "./selectOptionFilter";
import type { SelectOption } from "./Select";

const OPTIONS: SelectOption[] = [
  { label: "No category", value: "" },
  { label: "Animals", value: "animals" },
  { label: "Christian", value: "christian" },
  { label: "Christmas", value: "christmas" },
  { label: "Automotive", value: "auto" },
];

test("empty search returns all options in original order", () => {
  assert.deepEqual(filterSelectOptionsByLabel(OPTIONS, ""), OPTIONS);
  assert.deepEqual(filterSelectOptionsByLabel(OPTIONS, "   "), OPTIONS);
});

test("filters case-insensitively by display label", () => {
  const filtered = filterSelectOptionsByLabel(OPTIONS, "CHR");
  assert.deepEqual(
    filtered.map((option) => option.value),
    ["christian", "christmas"],
  );
});

test("partial-match filtering keeps original option values", () => {
  const filtered = filterSelectOptionsByLabel(OPTIONS, "istmas");
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0]?.value, "christmas");
  assert.equal(filtered[0]?.label, "Christmas");
});

test("No category is filtered by label match when searching", () => {
  assert.equal(filterSelectOptionsByLabel(OPTIONS, "chr").some((o) => o.value === ""), false);
  assert.equal(filterSelectOptionsByLabel(OPTIONS, "no cat").some((o) => o.value === ""), true);
});

test("no-results returns an empty array (UI shows quiet empty state)", () => {
  assert.deepEqual(filterSelectOptionsByLabel(OPTIONS, "zzzz-nope"), []);
});

test("filter path is pure — same input yields same output without mutating options", () => {
  const before = OPTIONS.map((option) => ({ ...option }));
  filterSelectOptionsByLabel(OPTIONS, "ani");
  assert.deepEqual(OPTIONS, before);
});
