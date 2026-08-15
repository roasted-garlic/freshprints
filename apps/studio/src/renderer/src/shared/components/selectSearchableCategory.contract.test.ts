import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rendererFeatures = path.resolve(__dirname, "../../features");

const selectSource = readFileSync(path.join(__dirname, "Select.tsx"), "utf8");
const designFormFields = readFileSync(
  path.join(rendererFeatures, "designs/components/DesignFormFields.tsx"),
  "utf8",
);
const aiReviewFormPanel = readFileSync(
  path.join(rendererFeatures, "ai-review/components/AiReviewFormPanel.tsx"),
  "utf8",
);
const designLibraryFilterControls = readFileSync(
  path.join(rendererFeatures, "designs/components/DesignLibraryFilterControls.tsx"),
  "utf8",
);
const filterSource = readFileSync(path.join(__dirname, "selectOptionFilter.ts"), "utf8");

test("Select searchable defaults to false", () => {
  assert.match(selectSource, /searchable\s*=\s*false/);
});

test("Select closes by clearing the transient search query", () => {
  assert.match(selectSource, /setSearchQuery\(""\)/);
  assert.match(selectSource, /const closeMenu = useCallback\(\(\) => \{[\s\S]*setSearchQuery\(""\)/);
});

test("DesignFormFields Category opts into searchable", () => {
  const categoryBlock = designFormFields.slice(
    designFormFields.indexOf('label="Category"'),
    designFormFields.indexOf('label="Placement"'),
  );
  assert.match(categoryBlock, /\bsearchable\b/);
  assert.match(categoryBlock, /Search categories\.\.\./);
});

test("DesignFormFields Placement remains non-searchable", () => {
  const placementBlock = designFormFields.slice(designFormFields.indexOf('label="Placement"'));
  assert.doesNotMatch(placementBlock, /\bsearchable\b/);
});

test("AiReviewFormPanel Category opts into searchable", () => {
  const categoryBlock = aiReviewFormPanel.slice(
    aiReviewFormPanel.indexOf('label="Category"'),
    aiReviewFormPanel.indexOf('label="Description"'),
  );
  assert.match(categoryBlock, /\bsearchable\b/);
  assert.match(categoryBlock, /Search categories\.\.\./);
});

test("Design Library filter Category remains non-searchable", () => {
  assert.match(designLibraryFilterControls, /<Select[\s\S]*options=\{categoryOptions\}/);
  assert.doesNotMatch(designLibraryFilterControls, /\bsearchable\b/);
});

test("Select filter helper has no Firestore or taxonomy service imports", () => {
  const importLines = filterSource
    .split(/\r?\n/)
    .filter((line) => /^\s*import\b/.test(line))
    .join("\n");
  assert.doesNotMatch(importLines, /firestore|categoryService|taxonomy|firebase/i);
});
