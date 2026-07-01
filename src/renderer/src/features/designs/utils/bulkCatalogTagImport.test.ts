import assert from "node:assert/strict";
import test from "node:test";

import { parseBulkCatalogTagJson, validateBulkCatalogTagJson } from "./bulkCatalogTagImport";

test("parseBulkCatalogTagJson parses the flat seed shape", () => {
  const parsed = parseBulkCatalogTagJson(`[
    {
      "name": " Skeleton ",
      "aliases": ["Bones", "ribcage", "skeleton"],
      "preferredWhen": " Use when a skeleton is important. "
    }
  ]`);

  assert.deepEqual(parsed, [
    {
      name: "skeleton",
      aliases: ["bones", "ribcage"],
      preferredWhen: "Use when a skeleton is important.",
    },
  ]);
});

test("parseBulkCatalogTagJson rejects malformed json", () => {
  assert.throws(() => parseBulkCatalogTagJson("{"), /Tag import JSON is invalid\./);
});

test("parseBulkCatalogTagJson rejects unsupported fields", () => {
  assert.throws(
    () =>
      parseBulkCatalogTagJson(`[
        {
          "name": "skeleton",
          "aliases": [],
          "preferredWhen": "Use for skeletons.",
          "categoryHints": ["Halloween"]
        }
      ]`),
    /unsupported field: categoryHints/,
  );
});

test("validateBulkCatalogTagJson rejects duplicate payload entries with reasons", () => {
  const result = validateBulkCatalogTagJson(`[
    {
      "name": "skeleton",
      "aliases": ["bones"],
      "preferredWhen": "Use for skeletons."
    },
    {
      "name": "bones",
      "aliases": [],
      "preferredWhen": "Duplicate."
    },
    {
      "name": "teacher",
      "aliases": ["school"],
      "preferredWhen": "Use for teacher designs."
    }
  ]`);

  assert.deepEqual(result.accepted, [
    {
      name: "skeleton",
      aliases: ["bones"],
      preferredWhen: "Use for skeletons.",
    },
    {
      name: "teacher",
      aliases: ["school"],
      preferredWhen: "Use for teacher designs.",
    },
  ]);
  assert.deepEqual(result.rejected, [
    {
      index: 1,
      name: "bones",
      reason: "\"bones\" duplicates skeleton from entry 1.",
    },
  ]);
});

test("validateBulkCatalogTagJson rejects malformed entries while accepting valid entries", () => {
  const result = validateBulkCatalogTagJson(`[
    {
      "name": "teacher",
      "aliases": ["school"],
      "preferredWhen": "Use for teacher designs."
    },
    {
      "name": "broken",
      "aliases": "school",
      "preferredWhen": "Invalid aliases."
    }
  ]`);

  assert.deepEqual(result.accepted, [
    {
      name: "teacher",
      aliases: ["school"],
      preferredWhen: "Use for teacher designs.",
    },
  ]);
  assert.equal(result.rejected.length, 1);
  assert.equal(result.rejected[0].index, 1);
  assert.equal(result.rejected[0].name, "broken");
  assert.match(result.rejected[0].reason, /Entry 2 aliases must be an array of strings\./);
});

test("parseBulkCatalogTagJson rejects alias collisions inside pasted payload", () => {
  assert.throws(
    () =>
      parseBulkCatalogTagJson(`[
        {
          "name": "skeleton",
          "aliases": ["bones"],
          "preferredWhen": "Use for skeletons."
        },
        {
          "name": "bones",
          "aliases": [],
          "preferredWhen": "Duplicate."
        }
      ]`),
    /1 tag entry was rejected\. Entry 2: "bones" duplicates skeleton from entry 1\./,
  );
});
