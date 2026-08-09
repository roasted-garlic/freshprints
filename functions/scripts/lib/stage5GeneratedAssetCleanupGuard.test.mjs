/**
 * Discriminating unit tests for Stage 5 cleanup allowlist guards.
 *
 * Run: node --test functions/scripts/lib/stage5GeneratedAssetCleanupGuard.test.mjs
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  STAGE5_ALLOWED_PROJECT_ID,
  STAGE5_FIRESTORE_COLLECTION,
  STAGE5_NEGATIVE_ROOTS,
  STAGE5_STORAGE_PREFIXES,
  assertAllowedStoragePath,
  assertStage5FirestoreCollection,
  assertStage5ProjectId,
  buildStage5DryRunRecord,
  isAllowedStoragePath,
} from "./stage5GeneratedAssetCleanupGuard.mjs";

describe("Stage 5 Storage allowlist", () => {
  it("A: accepts generated/portal-catalog/...", () => {
    assert.equal(isAllowedStoragePath("generated/portal-catalog/manifest.json"), true);
    assert.equal(assertAllowedStoragePath("generated/portal-catalog/v1/discover.json"), "generated/portal-catalog/v1/discover.json");
  });

  it("B: accepts generated/catalog-reference/...", () => {
    assert.equal(isAllowedStoragePath("generated/catalog-reference/manifest.json"), true);
    assert.equal(
      assertAllowedStoragePath("generated/catalog-reference/client/v1.json"),
      "generated/catalog-reference/client/v1.json",
    );
  });

  it("C: rejects originals/...", () => {
    assert.equal(isAllowedStoragePath("originals/design.png"), false);
    assert.throws(() => assertAllowedStoragePath("originals/design.png"), /outside Stage 5 allowlist/);
  });

  it("D: rejects thumbnails/...", () => {
    assert.equal(isAllowedStoragePath("thumbnails/design.webp"), false);
    assert.throws(() => assertAllowedStoragePath("thumbnails/design.webp"), /outside Stage 5 allowlist/);
  });

  it("E: rejects previews/...", () => {
    assert.equal(isAllowedStoragePath("previews/design.webp"), false);
    assert.throws(() => assertAllowedStoragePath("previews/design.webp"), /outside Stage 5 allowlist/);
  });

  it("F: rejects display/...", () => {
    assert.equal(isAllowedStoragePath("display/design.webp"), false);
    assert.throws(() => assertAllowedStoragePath("display/design.webp"), /outside Stage 5 allowlist/);
  });

  it("G: rejects customer-uploads/...", () => {
    assert.equal(isAllowedStoragePath("customer-uploads/abc/file.png"), false);
    assert.throws(() => assertAllowedStoragePath("customer-uploads/abc/file.png"), /outside Stage 5 allowlist/);
  });

  it("H: rejects arbitrary generated/other/...", () => {
    assert.equal(isAllowedStoragePath("generated/other/x.json"), false);
    assert.throws(() => assertAllowedStoragePath("generated/other/x.json"), /outside Stage 5 allowlist/);
  });

  it("rejects prefix lookalikes without trailing-slash boundary", () => {
    assert.equal(isAllowedStoragePath("generated/portal-catalog-extra/x.json"), false);
    assert.equal(isAllowedStoragePath("generated/catalog-reference-old/x.json"), false);
  });

  it("rejects path traversal attempts", () => {
    assert.equal(isAllowedStoragePath("generated/portal-catalog/../originals/x.png"), false);
    assert.throws(
      () => assertAllowedStoragePath("generated/portal-catalog/../originals/x.png"),
      /path traversal|outside Stage 5 allowlist/,
    );
  });
});

describe("Stage 5 project pin", () => {
  it("I: rejects wrong Firebase project", () => {
    assert.throws(() => assertStage5ProjectId("fresh-prints-prod"), /Hard-pinned/);
    assert.throws(() => assertStage5ProjectId("demo-project"), /Hard-pinned/);
  });

  it("accepts fresh-prints-dev only", () => {
    assert.doesNotThrow(() => assertStage5ProjectId(STAGE5_ALLOWED_PROJECT_ID));
  });
});

describe("Stage 5 Firestore allowlist", () => {
  it("K: only snapshotPublicationState is accepted", () => {
    assert.doesNotThrow(() => assertStage5FirestoreCollection(STAGE5_FIRESTORE_COLLECTION));
    assert.throws(() => assertStage5FirestoreCollection("designs"), /allows only/);
    assert.throws(() => assertStage5FirestoreCollection("categories"), /allows only/);
  });
});

describe("Stage 5 dry-run record", () => {
  it("J: dry-run mode marks no destructive actions", () => {
    const record = buildStage5DryRunRecord({
      projectId: STAGE5_ALLOWED_PROJECT_ID,
      mode: "dry-run",
      storageByPrefix: STAGE5_STORAGE_PREFIXES.map((prefix) => ({
        prefix,
        objectCount: 0,
        totalBytes: 0,
        samplePaths: [],
      })),
      firestore: {
        collectionId: STAGE5_FIRESTORE_COLLECTION,
        documentCount: 0,
        sampleIds: [],
      },
    });

    assert.equal(record.destructiveActionsPerformed, false);
    assert.equal(record.mode, "dry-run");
    assert.deepEqual(
      record.negativeRootChecklist.map((row) => row.root),
      [...STAGE5_NEGATIVE_ROOTS],
    );
    assert.ok(record.negativeRootChecklist.every((row) => row.targetedForDeletion === false));
  });

  it("refuses dry-run record for wrong project or collection", () => {
    assert.throws(
      () =>
        buildStage5DryRunRecord({
          projectId: "fresh-prints-prod",
          mode: "dry-run",
          storageByPrefix: [],
          firestore: { collectionId: STAGE5_FIRESTORE_COLLECTION, documentCount: 0, sampleIds: [] },
        }),
      /Hard-pinned/,
    );
  });
});
