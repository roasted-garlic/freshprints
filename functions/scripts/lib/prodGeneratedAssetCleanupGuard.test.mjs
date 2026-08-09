/**
 * Discriminating unit tests for production generated-asset cleanup guards.
 *
 * Run: node --test functions/scripts/lib/prodGeneratedAssetCleanupGuard.test.mjs
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  PROD_STORAGE_CLEANUP_ALLOWED_PROJECT_ID,
  PROD_STORAGE_CLEANUP_CONFIRM_ENV,
  PROD_STORAGE_CLEANUP_FIRESTORE_COLLECTION,
  PROD_STORAGE_CLEANUP_NEGATIVE_ROOTS,
  PROD_STORAGE_CLEANUP_STORAGE_PREFIXES,
  assertProdAllowedStoragePath,
  assertProdStorageCleanupApplyConfirm,
  assertProdStorageCleanupFirestoreCollection,
  assertProdStorageCleanupProjectId,
  buildProdStorageCleanupDryRunRecord,
  isProdAllowedStoragePath,
} from "./prodGeneratedAssetCleanupGuard.mjs";
import { assertStage5ProjectId } from "./stage5GeneratedAssetCleanupGuard.mjs";

describe("Prod Storage cleanup allowlist", () => {
  it("accepts generated/portal-catalog/...", () => {
    assert.equal(isProdAllowedStoragePath("generated/portal-catalog/manifest.json"), true);
    assert.equal(
      assertProdAllowedStoragePath("generated/portal-catalog/v1/discover.json"),
      "generated/portal-catalog/v1/discover.json",
    );
  });

  it("accepts generated/catalog-reference/...", () => {
    assert.equal(isProdAllowedStoragePath("generated/catalog-reference/manifest.json"), true);
  });

  it("rejects negative roots and other generated paths", () => {
    for (const root of PROD_STORAGE_CLEANUP_NEGATIVE_ROOTS) {
      assert.equal(isProdAllowedStoragePath(`${root}x`), false);
      assert.throws(() => assertProdAllowedStoragePath(`${root}x`), /outside prod cleanup allowlist/);
    }
    assert.equal(isProdAllowedStoragePath("generated/other/x.json"), false);
    assert.equal(isProdAllowedStoragePath("generated/portal-catalog-extra/x.json"), false);
  });

  it("rejects path traversal attempts", () => {
    assert.equal(isProdAllowedStoragePath("generated/portal-catalog/../originals/x.png"), false);
    assert.throws(
      () => assertProdAllowedStoragePath("generated/portal-catalog/../originals/x.png"),
      /path traversal|outside prod cleanup allowlist/,
    );
  });
});

describe("Prod Storage cleanup project pin", () => {
  it("accepts fresh-prints-prod only", () => {
    assert.doesNotThrow(() => assertProdStorageCleanupProjectId(PROD_STORAGE_CLEANUP_ALLOWED_PROJECT_ID));
    assert.throws(() => assertProdStorageCleanupProjectId("fresh-prints-dev"), /Hard-pinned/);
    assert.throws(() => assertProdStorageCleanupProjectId("demo-project"), /Hard-pinned/);
  });

  it("Stage 5 guard still refuses fresh-prints-prod (no escape hatch)", () => {
    assert.throws(() => assertStage5ProjectId("fresh-prints-prod"), /Hard-pinned/);
  });
});

describe("Prod Storage cleanup Firestore allowlist", () => {
  it("only snapshotPublicationState is accepted", () => {
    assert.doesNotThrow(() =>
      assertProdStorageCleanupFirestoreCollection(PROD_STORAGE_CLEANUP_FIRESTORE_COLLECTION),
    );
    assert.throws(() => assertProdStorageCleanupFirestoreCollection("designs"), /allows only/);
  });
});

describe("Prod Storage cleanup APPLY confirm", () => {
  it("requires CONFIRM_PROD_STORAGE_CLEANUP=1", () => {
    assert.throws(() => assertProdStorageCleanupApplyConfirm({}), /CONFIRM_PROD_STORAGE_CLEANUP/);
    assert.throws(
      () => assertProdStorageCleanupApplyConfirm({ [PROD_STORAGE_CLEANUP_CONFIRM_ENV]: "true" }),
      /CONFIRM_PROD_STORAGE_CLEANUP/,
    );
    assert.doesNotThrow(() =>
      assertProdStorageCleanupApplyConfirm({ [PROD_STORAGE_CLEANUP_CONFIRM_ENV]: "1" }),
    );
  });
});

describe("Prod Storage cleanup dry-run record", () => {
  it("dry-run mode marks no destructive actions and lists negative roots", () => {
    const record = buildProdStorageCleanupDryRunRecord({
      projectId: PROD_STORAGE_CLEANUP_ALLOWED_PROJECT_ID,
      mode: "dry-run",
      storageByPrefix: PROD_STORAGE_CLEANUP_STORAGE_PREFIXES.map((prefix) => ({
        prefix,
        objectCount: 0,
        totalBytes: 0,
        samplePaths: [],
      })),
      firestore: {
        collectionId: PROD_STORAGE_CLEANUP_FIRESTORE_COLLECTION,
        documentCount: 0,
        sampleIds: [],
      },
    });

    assert.equal(record.destructiveActionsPerformed, false);
    assert.equal(record.mode, "dry-run");
    assert.equal(record.applyConfirmEnv, PROD_STORAGE_CLEANUP_CONFIRM_ENV);
    assert.deepEqual(
      record.negativeRootChecklist.map((row) => row.root),
      [...PROD_STORAGE_CLEANUP_NEGATIVE_ROOTS],
    );
    assert.ok(record.negativeRootChecklist.every((row) => row.targetedForDeletion === false));
  });

  it("rejects records for non-prod project", () => {
    assert.throws(
      () =>
        buildProdStorageCleanupDryRunRecord({
          projectId: "fresh-prints-dev",
          mode: "dry-run",
          storageByPrefix: [],
          firestore: {
            collectionId: PROD_STORAGE_CLEANUP_FIRESTORE_COLLECTION,
            documentCount: 0,
            sampleIds: [],
          },
        }),
      /Hard-pinned/,
    );
  });
});
