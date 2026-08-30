import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  assertAiClearDoesNotTouchPreservedFields,
  buildCatalogReprocessAiClearUpdate,
  CATALOG_REPROCESS_PRESERVED_FIELD_KEYS,
} from "./catalogReprocessAiClear";
import { isAiReviewQueueEligibleDesign } from "./catalogReprocessEligibility";

const here = dirname(fileURLToPath(import.meta.url));

describe("catalogReprocessAiClear preservation", () => {
  it("clears AI-owned blobs including smartProfile and aiReviewNotes", () => {
    const update = buildCatalogReprocessAiClearUpdate();
    assert.equal(update.status, "imported");
    assert.equal(update.aiReviewStatus, "pending");
    assert.equal(update.aiProcessingStage, "queued");
    assert.ok(update.aiSuggestions);
    assert.ok(update.aiAnalysis);
    assert.ok(update.smartProfile);
    assert.ok(update.aiReviewNotes);
  });

  it("does not touch preserved B/D fields", () => {
    const update = buildCatalogReprocessAiClearUpdate();
    const touched = assertAiClearDoesNotTouchPreservedFields(update);
    assert.deepEqual(touched, []);
    for (const key of CATALOG_REPROCESS_PRESERVED_FIELD_KEYS) {
      assert.equal(Object.prototype.hasOwnProperty.call(update, key), false, key);
    }
  });
});

describe("catalogReprocess eligibility contract", () => {
  it("matches shared eligibility helper", () => {
    assert.equal(
      isAiReviewQueueEligibleDesign({ status: "imported", aiReviewStatus: "needs_review" }),
      true,
    );
    assert.equal(
      isAiReviewQueueEligibleDesign({ status: "ready", aiReviewStatus: "approved" }),
      false,
    );
  });
});

describe("catalogReprocess callables containment", () => {
  it("Start rejects non-shadow and live Autonomous via server preflight", () => {
    const source = readFileSync(join(here, "catalogReprocessCallables.ts"), "utf8");
    assert.match(source, /assertShadowCalibrationStartAllowed/);
    assert.match(source, /mode !== "shadow"/);
    assert.match(source, /catalogAutonomousLiveEnabled === true/);
    assert.match(source, /Only the owner can manage Catalog Reprocessing/);
  });

  it("records v30 + normalizer-v4 on job Start", () => {
    const source = readFileSync(join(here, "catalogReprocessCallables.ts"), "utf8");
    const constants = readFileSync(
      join(here, "../../../packages/shared/src/constants/catalogReprocess.constants.ts"),
      "utf8",
    );
    assert.match(source, /CATALOG_REPROCESS_PROMPT_VERSION_SNAPSHOT/);
    assert.match(source, /CATALOG_REPROCESS_NORMALIZER_VERSION_SNAPSHOT/);
    assert.match(source, /promptVersion/);
    assert.match(source, /normalizerVersion/);
    assert.match(constants, /catalog-enrich-v30/);
    assert.match(constants, /smart-profile-normalizer-v4/);
  });

  it("Ready Catalog and AI Review Queue gates enabled on DEV", () => {
    const constants = readFileSync(
      join(here, "../../../packages/shared/src/constants/catalogReprocess.constants.ts"),
      "utf8",
    );
    assert.match(constants, /CATALOG_REPROCESS_READY_CATALOG_ENABLED = true/);
    assert.match(constants, /CATALOG_REPROCESS_AI_REVIEW_QUEUE_ENABLED = true/);
  });
});

describe("catalogReprocess worker containment", () => {
  it("uses outcomes subcollection, shadow post-write assert, and pipeline entry", () => {
    const worker = readFileSync(join(here, "catalogReprocessWorker.ts"), "utf8");
    assert.match(worker, /CATALOG_REPROCESS_OUTCOMES_SUBCOLLECTION/);
    assert.match(worker, /shadow_lifecycle_violation/);
    assert.match(worker, /runAiEnrichmentPipeline/);
    assert.match(worker, /buildCatalogReprocessAiClearUpdate/);
    assert.match(worker, /skipped_ineligible/);
    assert.match(worker, /wouldAutoApprove/);
    assert.doesNotMatch(worker, /useAiProcessingQueue/);
  });

  it("onWrite worker enables ai_review_queue and ready_catalog targets", () => {
    const source = readFileSync(join(here, "onCatalogReprocessJobWritten.ts"), "utf8");
    assert.match(source, /geminiApiKeySecret/);
    assert.match(source, /processNextCatalogReprocessUnit/);
    assert.match(source, /ready_catalog/);
    assert.match(source, /boundedDesignIds/);
  });
});

describe("Algolia ready publish safety (Shadow Needs Review)", () => {
  it("record builder still nulls non-ready designs", () => {
    const builder = readFileSync(
      join(here, "../algolia/buildPortalCatalogAlgoliaRecord.ts"),
      "utf8",
    );
    assert.match(builder, /status !== ['"]ready['"]/);
  });

  it("sync deletes non-ready index objects", () => {
    const sync = readFileSync(join(here, "../algolia/syncPortalCatalogDesignToAlgolia.ts"), "utf8");
    assert.match(sync, /afterReady = after\?\.status === ['"]ready['"]/);
    assert.match(sync, /deleteObject/);
  });
});
