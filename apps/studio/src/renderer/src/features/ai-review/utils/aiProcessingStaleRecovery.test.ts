import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { AI_ENRICHMENT_STALE_STAGE_MS } from "@fresh-prints/shared/constants/aiEnrichment.constants";

import type { Design } from "../../designs/types/design.types";
import {
  isAiProcessingStaleForRecovery,
  resolveDesignUpdatedAtMs,
  STALE_PROCESSING_ALREADY_PROCESSING_MESSAGE,
  STALE_PROCESSING_STATUS_COPY,
} from "./aiProcessingStaleRecovery";
import { resolveAiProcessingOutputStatus } from "./aiProcessingOutput";

function createDesign(overrides: Partial<Design> = {}): Design {
  return {
    id: "design-1",
    title: "Test Design",
    tags: [],
    status: "imported",
    originalPath: "/originals/design-1.png",
    thumbnailPath: "/thumbnails/design-1.webp",
    previewPath: "/previews/design-1.webp",
    uploadedBy: "user-1",
    queueCount: 0,
    aiProcessed: false,
    aiReviewed: false,
    aiReviewStatus: "pending",
    aiProcessingStage: "sending_to_ai",
    createdBy: "user-1",
    updatedBy: "user-1",
    createdAt: { toMillis: () => Date.now() } as Design["createdAt"],
    updatedAt: { toMillis: () => Date.now() } as Design["updatedAt"],
    ...overrides,
  };
}

describe("aiProcessingStaleRecovery", () => {
  it("fresh waiting state under 10 minutes is not stale", () => {
    const now = Date.UTC(2026, 8, 2, 12, 0, 0);
    const design = createDesign({
      updatedAt: {
        toMillis: () => now - AI_ENRICHMENT_STALE_STAGE_MS + 60_000,
      } as Design["updatedAt"],
    });

    assert.equal(resolveAiProcessingOutputStatus(design), "waiting");
    assert.equal(isAiProcessingStaleForRecovery(design, now), false);
  });

  it("waiting state exactly at stale threshold is not stale (server uses strict >)", () => {
    const now = Date.UTC(2026, 8, 2, 12, 0, 0);
    const design = createDesign({
      updatedAt: {
        toMillis: () => now - AI_ENRICHMENT_STALE_STAGE_MS,
      } as Design["updatedAt"],
    });

    assert.equal(isAiProcessingStaleForRecovery(design, now), false);
  });

  it("waiting state older than threshold is stale", () => {
    const now = Date.UTC(2026, 8, 2, 12, 0, 0);
    const design = createDesign({
      updatedAt: {
        toMillis: () => now - AI_ENRICHMENT_STALE_STAGE_MS - 1,
      } as Design["updatedAt"],
    });

    assert.equal(isAiProcessingStaleForRecovery(design, now), true);
  });

  it("missing or invalid updatedAt is not falsely stale", () => {
    const now = Date.UTC(2026, 8, 2, 12, 0, 0);
    const missing = createDesign({ updatedAt: undefined as unknown as Design["updatedAt"] });
    const invalid = createDesign({
      updatedAt: { toMillis: () => Number.NaN } as Design["updatedAt"],
    });

    assert.equal(resolveDesignUpdatedAtMs(missing), null);
    assert.equal(resolveDesignUpdatedAtMs(invalid), null);
    assert.equal(isAiProcessingStaleForRecovery(missing, now), false);
    assert.equal(isAiProcessingStaleForRecovery(invalid, now), false);
  });

  it("failed state is not stale retryable", () => {
    const now = Date.UTC(2026, 8, 2, 12, 0, 0);
    const design = createDesign({
      aiProcessingStage: "failed",
      aiSuggestions: { errorCode: "timeout", provider: "google" },
      updatedAt: {
        toMillis: () => now - AI_ENRICHMENT_STALE_STAGE_MS - 60_000,
      } as Design["updatedAt"],
    });

    assert.equal(resolveAiProcessingOutputStatus(design), "failed");
    assert.equal(isAiProcessingStaleForRecovery(design, now), false);
  });

  it("ready/terminal output is not stale retryable", () => {
    const now = Date.UTC(2026, 8, 2, 12, 0, 0);
    const design = createDesign({
      aiProcessingStage: "ready_for_review",
      aiReviewStatus: "needs_review",
      aiSuggestions: { title: "Ready", provider: "google" },
      updatedAt: {
        toMillis: () => now - AI_ENRICHMENT_STALE_STAGE_MS - 60_000,
      } as Design["updatedAt"],
    });

    assert.equal(resolveAiProcessingOutputStatus(design), "ready");
    assert.equal(isAiProcessingStaleForRecovery(design, now), false);
  });

  it("exports stable staff-facing copy constants", () => {
    assert.equal(STALE_PROCESSING_STATUS_COPY, "Processing appears stuck");
    assert.match(STALE_PROCESSING_ALREADY_PROCESSING_MESSAGE, /still processing/i);
  });
});
