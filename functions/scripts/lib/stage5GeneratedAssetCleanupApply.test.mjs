/**
 * Tests for Stage 5 APPLY retry / batch / transient classification.
 *
 * Run: node --test functions/scripts/lib/stage5GeneratedAssetCleanupApply.test.mjs
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  STAGE5_APPLY_CONCURRENCY,
  buildApplyVerificationSummary,
  computeBackoffMs,
  deleteAllowlistedPathsInBatches,
  isTransientStorageError,
  withTransientRetry,
} from "./stage5GeneratedAssetCleanupApply.mjs";

describe("isTransientStorageError", () => {
  it("classifies the observed GCS internal error message as transient", () => {
    assert.equal(
      isTransientStorageError(new Error("We encountered an internal error. Please try again.")),
      true,
    );
  });

  it("classifies 429/500/503 and UNAVAILABLE as transient", () => {
    assert.equal(isTransientStorageError({ code: 429, message: "rate" }), true);
    assert.equal(isTransientStorageError({ code: 500, message: "err" }), true);
    assert.equal(isTransientStorageError({ code: 503, message: "err" }), true);
    assert.equal(isTransientStorageError({ code: "UNAVAILABLE", message: "x" }), true);
    assert.equal(isTransientStorageError({ code: 14, message: "unavailable" }), true);
  });

  it("does not classify permanent 403/404-style errors as transient", () => {
    assert.equal(isTransientStorageError({ code: 403, message: "forbidden" }), false);
    assert.equal(isTransientStorageError(new Error("Permission denied")), false);
    assert.equal(isTransientStorageError(new Error("outside Stage 5 allowlist")), false);
  });
});

describe("withTransientRetry", () => {
  it("retries transient failures then succeeds", async () => {
    let attempts = 0;
    const delays = [];
    const result = await withTransientRetry(
      async () => {
        attempts += 1;
        if (attempts < 3) {
          throw new Error("We encountered an internal error. Please try again.");
        }
        return "ok";
      },
      {
        maxAttempts: 5,
        sleep: async (ms) => {
          delays.push(ms);
        },
        random: () => 0,
      },
    );
    assert.equal(result, "ok");
    assert.equal(attempts, 3);
    assert.equal(delays.length, 2);
  });

  it("does not retry permanent failures", async () => {
    let attempts = 0;
    await assert.rejects(
      () =>
        withTransientRetry(
          async () => {
            attempts += 1;
            throw Object.assign(new Error("forbidden"), { code: 403 });
          },
          { maxAttempts: 5, sleep: async () => {} },
        ),
      /forbidden/,
    );
    assert.equal(attempts, 1);
  });
});

describe("computeBackoffMs", () => {
  it("grows with attempt and respects max", () => {
    const a1 = computeBackoffMs(1, { baseDelayMs: 100, maxDelayMs: 1000, random: () => 0 });
    const a4 = computeBackoffMs(4, { baseDelayMs: 100, maxDelayMs: 1000, random: () => 0 });
    assert.ok(a4 >= a1);
    assert.ok(a4 <= 1000);
  });
});

describe("deleteAllowlistedPathsInBatches", () => {
  it("deletes allowlisted paths with bounded concurrency and asserts each path", async () => {
    const deleted = [];
    const result = await deleteAllowlistedPathsInBatches({
      paths: [
        "generated/portal-catalog/a.json",
        "generated/catalog-reference/b.json",
        "generated/portal-catalog/c.json",
      ],
      concurrency: 2,
      deleteOne: async (path) => {
        deleted.push(path);
      },
      sleep: async () => {},
      random: () => 0,
    });
    assert.equal(result.succeeded, 3);
    assert.equal(result.failed.length, 0);
    assert.deepEqual(deleted.sort(), [
      "generated/catalog-reference/b.json",
      "generated/portal-catalog/a.json",
      "generated/portal-catalog/c.json",
    ]);
  });

  it("hard-refuses non-allowlisted paths before any delete", async () => {
    let deletes = 0;
    await assert.rejects(
      () =>
        deleteAllowlistedPathsInBatches({
          paths: ["generated/portal-catalog/ok.json", "originals/x.png"],
          deleteOne: async () => {
            deletes += 1;
          },
          sleep: async () => {},
        }),
      /outside Stage 5 allowlist/,
    );
    assert.equal(deletes, 0);
  });

  it("retries transient errors per object and remains idempotent on re-run style deletes", async () => {
    const attemptsByPath = new Map();
    const result = await deleteAllowlistedPathsInBatches({
      paths: ["generated/portal-catalog/flaky.json"],
      concurrency: STAGE5_APPLY_CONCURRENCY,
      maxAttempts: 4,
      deleteOne: async (path) => {
        const n = (attemptsByPath.get(path) ?? 0) + 1;
        attemptsByPath.set(path, n);
        if (n < 3) {
          throw new Error("We encountered an internal error. Please try again.");
        }
      },
      sleep: async () => {},
      random: () => 0,
    });
    assert.equal(result.succeeded, 1);
    assert.equal(attemptsByPath.get("generated/portal-catalog/flaky.json"), 3);
  });

  it("collects permanent failures without aborting sibling deletes in the batch", async () => {
    const deleted = [];
    const result = await deleteAllowlistedPathsInBatches({
      paths: [
        "generated/portal-catalog/good.json",
        "generated/portal-catalog/bad.json",
        "generated/catalog-reference/also-good.json",
      ],
      concurrency: 3,
      maxAttempts: 2,
      deleteOne: async (path) => {
        if (path.includes("bad.json")) {
          throw Object.assign(new Error("forbidden"), { code: 403 });
        }
        deleted.push(path);
      },
      sleep: async () => {},
      random: () => 0,
    });
    assert.equal(result.succeeded, 2);
    assert.equal(result.failed.length, 1);
    assert.equal(result.failed[0].path, "generated/portal-catalog/bad.json");
    assert.ok(deleted.includes("generated/portal-catalog/good.json"));
    assert.ok(deleted.includes("generated/catalog-reference/also-good.json"));
  });
});

describe("buildApplyVerificationSummary", () => {
  it("reports fullyClean only when storage and firestore are empty", () => {
    const dirty = buildApplyVerificationSummary(
      [
        { prefix: "generated/portal-catalog/", objectCount: 5 },
        { prefix: "generated/catalog-reference/", objectCount: 0 },
      ],
      2,
    );
    assert.equal(dirty.storageClean, false);
    assert.equal(dirty.fullyClean, false);
    assert.equal(dirty.remainingStorageObjects, 5);

    const clean = buildApplyVerificationSummary(
      [
        { prefix: "generated/portal-catalog/", objectCount: 0 },
        { prefix: "generated/catalog-reference/", objectCount: 0 },
      ],
      0,
    );
    assert.equal(clean.fullyClean, true);
  });
});
