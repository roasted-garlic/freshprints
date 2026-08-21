import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const source = readFileSync(path.join(__dirname, "TagChipInput.tsx"), "utf8");

test("selectSuggestion closes the approved-tag list after a pick", () => {
  const start = source.indexOf("function selectSuggestion");
  assert.ok(start >= 0, "expected selectSuggestion");
  const block = source.slice(start, start + 450);
  assert.match(block, /setIsSuggestionsOpen\(false\)/);
  assert.match(block, /setInputValue\(""\)/);
});

test("TagChipInput does not own Tag Management", () => {
  assert.doesNotMatch(source, /TagManagementModal/);
});
