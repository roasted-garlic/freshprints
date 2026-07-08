import assert from "node:assert/strict";
import test from "node:test";

import { parseBulkCategoryJson } from "./bulkCategoryImport";

test("parseBulkCategoryJson trims and returns category name and description pairs", () => {
  const parsed = parseBulkCategoryJson(`[
    {
      "name": " Occasions ",
      "description": " Life events and celebration designs. "
    },
    {
      "name": "Holiday & Seasonal",
      "description": "Holiday and season designs."
    }
  ]`);

  assert.deepEqual(parsed, [
    {
      name: "Occasions",
      description: "Life events and celebration designs.",
    },
    {
      name: "Holiday & Seasonal",
      description: "Holiday and season designs.",
    },
  ]);
});

test("parseBulkCategoryJson rejects malformed json", () => {
  assert.throws(
    () => parseBulkCategoryJson("{"),
    /Category import JSON is invalid\./,
  );
});

test("parseBulkCategoryJson rejects non-array payloads", () => {
  assert.throws(
    () => parseBulkCategoryJson('{"name":"Occasions","description":"x"}'),
    /Category import JSON must be an array\./,
  );
});

test("parseBulkCategoryJson rejects unsupported fields", () => {
  assert.throws(
    () =>
      parseBulkCategoryJson(`[
        {
          "name": "Occasions",
          "description": "Life events",
          "sortOrder": 0
        }
      ]`),
    /Entry 1 contains unsupported field: sortOrder\./,
  );
});

test("parseBulkCategoryJson rejects duplicate names case-insensitively", () => {
  assert.throws(
    () =>
      parseBulkCategoryJson(`[
        {
          "name": "Occasions",
          "description": "Life events"
        },
        {
          "name": "occasions",
          "description": "Duplicate"
        }
      ]`),
    /Entry 2 duplicates another pasted category name: occasions\./,
  );
});
