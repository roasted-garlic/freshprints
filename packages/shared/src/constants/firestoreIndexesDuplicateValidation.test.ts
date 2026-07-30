import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");

interface IndexField {
  fieldPath: string;
  order?: string;
  arrayConfig?: string;
}

interface IndexDefinition {
  collectionGroup: string;
  queryScope: string;
  fields: IndexField[];
}

interface IndexesFile {
  indexes: IndexDefinition[];
  fieldOverrides?: unknown[];
}

/**
 * Deterministic structural identity for a Firestore composite index — independent of raw JSON
 * formatting or object-key order. Two definitions with the same identity are the same index to
 * Firestore (see the 2026-07-30 production `firestore.indexes.json` HTTP 409 "index already
 * exists" failure caused by exactly this kind of duplicate).
 */
function canonicalIndexIdentity(index: IndexDefinition): string {
  const fields = index.fields
    .map((field) => {
      const parts = [`fieldPath=${field.fieldPath}`];
      if (field.order) parts.push(`order=${field.order}`);
      if (field.arrayConfig) parts.push(`arrayConfig=${field.arrayConfig}`);
      return parts.join(",");
    })
    .join(";");
  return `collectionGroup=${index.collectionGroup}|queryScope=${index.queryScope}|fields=[${fields}]`;
}

function findDuplicates(indexes: IndexDefinition[]): Map<string, number[]> {
  const positionsByIdentity = new Map<string, number[]>();
  indexes.forEach((index, position) => {
    const identity = canonicalIndexIdentity(index);
    const positions = positionsByIdentity.get(identity) ?? [];
    positions.push(position);
    positionsByIdentity.set(identity, positions);
  });

  const duplicates = new Map<string, number[]>();
  for (const [identity, positions] of positionsByIdentity) {
    if (positions.length > 1) {
      duplicates.set(identity, positions);
    }
  }
  return duplicates;
}

describe("firestore.indexes.json duplicate validation", () => {
  it("parses as valid JSON", async () => {
    const indexesPath = path.join(REPO_ROOT, "firestore.indexes.json");
    const raw = await readFile(indexesPath, "utf8");

    assert.doesNotThrow(() => JSON.parse(raw), "firestore.indexes.json must be valid JSON");
  });

  it("has no duplicate composite index definitions", async () => {
    const indexesPath = path.join(REPO_ROOT, "firestore.indexes.json");
    const raw = await readFile(indexesPath, "utf8");
    const parsed = JSON.parse(raw) as IndexesFile;

    const duplicates = findDuplicates(parsed.indexes);

    if (duplicates.size > 0) {
      const details = [...duplicates.entries()]
        .map(([identity, positions]) => `  - ${identity} (array positions: ${positions.join(", ")})`)
        .join("\n");
      assert.fail(
        `firestore.indexes.json contains ${duplicates.size} duplicate index definition(s), ` +
          `which causes production deployment to fail with HTTP 409 "index already exists":\n${details}`,
      );
    }
  });

  it("detects an exact duplicate in a fixture", () => {
    const fixture: IndexDefinition[] = [
      {
        collectionGroup: "customerUploads",
        queryScope: "COLLECTION",
        fields: [
          { fieldPath: "purpose", order: "ASCENDING" },
          { fieldPath: "catalogReviewStatus", order: "ASCENDING" },
        ],
      },
      {
        collectionGroup: "customerUploads",
        queryScope: "COLLECTION",
        fields: [
          { fieldPath: "purpose", order: "ASCENDING" },
          { fieldPath: "catalogReviewStatus", order: "ASCENDING" },
        ],
      },
    ];

    const duplicates = findDuplicates(fixture);

    assert.equal(duplicates.size, 1, "fixture with two identical definitions must be flagged");
    const [positions] = [...duplicates.values()];
    assert.deepEqual(positions, [0, 1]);
  });

  it("does not flag a two-field index and its three-field prefix-extension as duplicates", () => {
    const fixture: IndexDefinition[] = [
      {
        collectionGroup: "customerUploads",
        queryScope: "COLLECTION",
        fields: [
          { fieldPath: "purpose", order: "ASCENDING" },
          { fieldPath: "catalogReviewStatus", order: "ASCENDING" },
          { fieldPath: "createdAt", order: "DESCENDING" },
        ],
      },
      {
        collectionGroup: "customerUploads",
        queryScope: "COLLECTION",
        fields: [
          { fieldPath: "purpose", order: "ASCENDING" },
          { fieldPath: "catalogReviewStatus", order: "ASCENDING" },
        ],
      },
    ];

    const duplicates = findDuplicates(fixture);

    assert.equal(
      duplicates.size,
      0,
      "a two-field index must not be flagged as a duplicate of its three-field prefix-extension",
    );
  });
});
