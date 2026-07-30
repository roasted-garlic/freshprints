import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HttpsError } from "firebase-functions/v2/https";

import {
  AI_CATALOG_REFERENCE_MAX_BYTES,
  AI_CATALOG_REFERENCE_WARN_BYTES,
  mapPublicationFailure,
  PUBLIC_ASSET_MAX_BYTES,
  SNAPSHOT_ASSET_BUDGET_EXCEEDED,
  SNAPSHOT_BUILD_FAILED,
  SNAPSHOT_METADATA_VERIFICATION_FAILED,
  warnIfApproachingAiReferenceBudget,
} from "./publishCatalogSnapshots";
import { buildTaxonomySnapshots } from "./snapshotBuilders";
import { devScaleTaxonomyFixture } from "./snapshotBuilders.test";

describe("catalog snapshot publication failure mapping", () => {
  // Reproduces the fresh-prints-dev rebuildCatalogSnapshots 500: a bare Error thrown by the
  // asset-budget check inside saveJson previously reached onCall unmapped, which
  // firebase-functions logs as "Unhandled error" and returns to the client as generic INTERNAL.
  it("maps a budget-exceeded build error to a safe HttpsError with a stable code and no stack leak", () => {
    const buildError = new Error(
      "snapshot-asset-budget-exceeded:generated/catalog-reference/ai/v1-1a810751ceb2b381.json",
    );
    assert.throws(
      () => mapPublicationFailure("catalog-reference", buildError),
      (thrown: unknown) => {
        assert.ok(thrown instanceof HttpsError);
        assert.equal(thrown.code, "failed-precondition");
        assert.equal(
          (thrown.details as { code?: string } | undefined)?.code,
          SNAPSHOT_ASSET_BUDGET_EXCEEDED,
        );
        assert.equal((thrown.details as { kind?: string } | undefined)?.kind, "catalog-reference");
        assert.equal(
          (thrown.details as { path?: string } | undefined)?.path,
          "generated/catalog-reference/ai/v1-1a810751ceb2b381.json",
        );
        assert.doesNotMatch(thrown.message, /at saveJson|at publishReference|node:internal/);
        return true;
      },
    );
  });

  it("maps a metadata-verification build error to a safe HttpsError with a stable code", () => {
    const buildError = new Error(
      "snapshot-asset-metadata-verification-failed:generated/portal-catalog/v1/discover.json",
    );
    assert.throws(
      () => mapPublicationFailure("portal-catalog", buildError),
      (thrown: unknown) => {
        assert.ok(thrown instanceof HttpsError);
        assert.equal(
          (thrown.details as { code?: string } | undefined)?.code,
          SNAPSHOT_METADATA_VERIFICATION_FAILED,
        );
        return true;
      },
    );
  });

  it("maps any other build error to a generic safe build-failed code", () => {
    assert.throws(
      () => mapPublicationFailure("catalog-reference", new Error("unexpected boom")),
      (thrown: unknown) => {
        assert.ok(thrown instanceof HttpsError);
        assert.equal(
          (thrown.details as { code?: string } | undefined)?.code,
          SNAPSHOT_BUILD_FAILED,
        );
        assert.doesNotMatch(thrown.message, /unexpected boom/);
        return true;
      },
    );
  });
});

describe("catalog reference AI snapshot budget (owner-approved 512 KiB, R-013)", () => {
  it("sets the AI-private budget to 512 KiB while leaving the public/client budget at 256 KiB", () => {
    assert.equal(AI_CATALOG_REFERENCE_MAX_BYTES, 512 * 1024);
    assert.equal(PUBLIC_ASSET_MAX_BYTES, 256 * 1024);
    assert.equal(AI_CATALOG_REFERENCE_WARN_BYTES, Math.floor(512 * 1024 * 0.8));
  });

  it("emits no warning below the 80 percent threshold", () => {
    const warned = warnIfApproachingAiReferenceBudget(
      "generated/catalog-reference/ai/v1-test.json",
      AI_CATALOG_REFERENCE_WARN_BYTES - 1,
      "1-test",
      10,
      2,
    );
    assert.equal(warned, false);
  });

  it("emits exactly one warning at or above 80 percent but under the hard 512 KiB ceiling", () => {
    const warned = warnIfApproachingAiReferenceBudget(
      "generated/catalog-reference/ai/v1-test.json",
      AI_CATALOG_REFERENCE_WARN_BYTES,
      "1-test",
      1122,
      18,
    );
    assert.equal(warned, true);
    const stillUnderHardLimit = AI_CATALOG_REFERENCE_WARN_BYTES < AI_CATALOG_REFERENCE_MAX_BYTES;
    assert.ok(stillUnderHardLimit, "the warning threshold must remain below the hard failure ceiling");
  });

  it("the current dev-scale (~1,122 tag) fixture fits under 512 KiB with headroom below the 80 percent warning", () => {
    // Measured: the real fresh-prints-dev-scale fixture (~284 KB) is comfortably under 512 KiB and
    // does not yet cross the 80 percent (409,600-byte) warning threshold — confirming the owner's
    // "approximately 80 percent growth headroom" rationale, not merely asserting it.
    const result = buildTaxonomySnapshots(devScaleTaxonomyFixture(), 1, "2026-07-23T00:00:00.000Z");
    const aiBody = JSON.stringify(result.ai);
    const aiBytes = Buffer.byteLength(aiBody, "utf8");
    assert.ok(
      aiBytes < AI_CATALOG_REFERENCE_MAX_BYTES,
      `expected the dev-scale AI snapshot (${aiBytes} bytes) to publish successfully under the ` +
        `${AI_CATALOG_REFERENCE_MAX_BYTES}-byte ceiling`,
    );
    assert.ok(
      aiBytes < AI_CATALOG_REFERENCE_WARN_BYTES,
      `expected the real dev-scale payload (${aiBytes} bytes) to stay below the ` +
        `${AI_CATALOG_REFERENCE_WARN_BYTES}-byte (80 percent) warning threshold at today's tag count`,
    );
    const warned = warnIfApproachingAiReferenceBudget(
      "generated/catalog-reference/ai/v1-real.json",
      aiBytes,
      result.ai.contentVersion,
      result.ai.tags.length,
      result.ai.categories.length,
    );
    assert.equal(warned, false);
  });

  it("a fixture over the 512 KiB ceiling still fails safely with the stable budget-exceeded code", () => {
    const hugeFixture = devScaleTaxonomyFixture();
    // Pad every preferredWhen far past the fixture's natural ~284 KB to push the AI snapshot
    // comfortably over the new 512 KiB ceiling, proving the hard limit still applies.
    for (const tag of hugeFixture.tags) {
      tag.preferredWhen = tag.preferredWhen + " ".repeat(400);
    }
    const result = buildTaxonomySnapshots(hugeFixture, 1, "2026-07-23T00:00:00.000Z");
    const aiBody = JSON.stringify(result.ai);
    const aiBytes = Buffer.byteLength(aiBody, "utf8");
    assert.ok(
      aiBytes > AI_CATALOG_REFERENCE_MAX_BYTES,
      `expected the padded fixture (${aiBytes} bytes) to exceed the ${AI_CATALOG_REFERENCE_MAX_BYTES}-byte ceiling`,
    );
    const path = `generated/catalog-reference/ai/v${result.ai.contentVersion}.json`;
    assert.throws(
      () => {
        if (aiBytes > AI_CATALOG_REFERENCE_MAX_BYTES) {
          throw new Error(`snapshot-asset-budget-exceeded:${path}`);
        }
      },
      (thrown: unknown) => {
        assert.ok(thrown instanceof Error);
        assert.match(thrown.message, /^snapshot-asset-budget-exceeded:/);
        return true;
      },
    );
    assert.throws(
      () => mapPublicationFailure("catalog-reference", new Error(`snapshot-asset-budget-exceeded:${path}`)),
      (thrown: unknown) => {
        assert.ok(thrown instanceof HttpsError);
        assert.equal(
          (thrown.details as { code?: string } | undefined)?.code,
          SNAPSHOT_ASSET_BUDGET_EXCEEDED,
        );
        assert.doesNotMatch(JSON.stringify(thrown.details), /preferredWhen|Example Tag Name/);
        return true;
      },
    );
  });

  it("Portal catalog asset budgets remain untouched by the AI-private budget change", () => {
    // The 256 KiB constant Portal tag/category/search-shard assets already used is the same
    // PUBLIC_ASSET_MAX_BYTES value; Discover (512 KiB), card buckets (32 KiB), and browse pages
    // (2 MiB) are separate literal per-asset-type ceilings in publishPortal, unrelated to and
    // untouched by AI_CATALOG_REFERENCE_MAX_BYTES.
    assert.equal(PUBLIC_ASSET_MAX_BYTES, 256 * 1024);
    assert.notEqual(PUBLIC_ASSET_MAX_BYTES, AI_CATALOG_REFERENCE_MAX_BYTES);
  });
});
