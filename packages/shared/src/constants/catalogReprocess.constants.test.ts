import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CATALOG_REPROCESS_AI_REVIEW_QUEUE_ENABLED,
  CATALOG_REPROCESS_NORMALIZER_VERSION_SNAPSHOT,
  CATALOG_REPROCESS_PROMPT_VERSION_SNAPSHOT,
  CATALOG_REPROCESS_READY_CATALOG_ENABLED,
  isAiReviewQueueEligibleDesign,
  isCatalogReprocessTargetEnabled,
  isReadyCatalogEligibleDesign,
  resolveCatalogReprocessConfirmationPhrase,
} from "../constants/catalogReprocess.constants";

describe("catalogReprocess Slice 5/6 gates", () => {
  it("enables AI Review Queue and Ready Catalog on DEV", () => {
    assert.equal(CATALOG_REPROCESS_AI_REVIEW_QUEUE_ENABLED, true);
    assert.equal(CATALOG_REPROCESS_READY_CATALOG_ENABLED, true);
    assert.equal(isCatalogReprocessTargetEnabled("ai_review_queue"), true);
    assert.equal(isCatalogReprocessTargetEnabled("ready_catalog"), true);
  });

  it("keeps DEV and PRODUCTION confirmation phrases", () => {
    assert.equal(
      resolveCatalogReprocessConfirmationPhrase({
        targetType: "ai_review_queue",
        isProduction: false,
      }),
      "REPROCESS AI REVIEW QUEUE",
    );
    assert.equal(
      resolveCatalogReprocessConfirmationPhrase({
        targetType: "ready_catalog",
        isProduction: false,
      }),
      "REPROCESS READY CATALOG",
    );
  });

  it("snapshots v31 + normalizer-v5 labels", () => {
    assert.equal(CATALOG_REPROCESS_PROMPT_VERSION_SNAPSHOT, "catalog-enrich-v31");
    assert.equal(CATALOG_REPROCESS_NORMALIZER_VERSION_SNAPSHOT, "smart-profile-normalizer-v5");
  });
});

describe("isAiReviewQueueEligibleDesign", () => {
  it("includes imported + needs_review including already-v29 and missing profile cases", () => {
    assert.equal(
      isAiReviewQueueEligibleDesign({ status: "imported", aiReviewStatus: "needs_review" }),
      true,
    );
  });

  it("excludes ready, rejected, archived, pending, and processing", () => {
    assert.equal(
      isAiReviewQueueEligibleDesign({ status: "ready", aiReviewStatus: "approved" }),
      false,
    );
    assert.equal(
      isAiReviewQueueEligibleDesign({ status: "rejected", aiReviewStatus: "rejected" }),
      false,
    );
    assert.equal(
      isAiReviewQueueEligibleDesign({ status: "archived", aiReviewStatus: "needs_review" }),
      false,
    );
    assert.equal(
      isAiReviewQueueEligibleDesign({ status: "imported", aiReviewStatus: "pending" }),
      false,
    );
    assert.equal(
      isAiReviewQueueEligibleDesign({ status: "processing", aiReviewStatus: "pending" }),
      false,
    );
    assert.equal(
      isAiReviewQueueEligibleDesign({ status: "imported", aiReviewStatus: "approved" }),
      false,
    );
  });
});

describe("isReadyCatalogEligibleDesign", () => {
  it("includes ready+approved and excludes queue/rejected states", () => {
    assert.equal(
      isReadyCatalogEligibleDesign({ status: "ready", aiReviewStatus: "approved" }),
      true,
    );
    assert.equal(
      isReadyCatalogEligibleDesign({ status: "ready", aiReviewStatus: "needs_review" }),
      false,
    );
    assert.equal(
      isReadyCatalogEligibleDesign({ status: "imported", aiReviewStatus: "needs_review" }),
      false,
    );
  });
});
