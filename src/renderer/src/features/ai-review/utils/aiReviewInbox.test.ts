import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildAiReviewInboxListQuery, getAiReviewEmptyState } from "../constants/aiReviewInboxConstants";
import {
  createAiReviewDraftFromDesign,
  isAiReviewDraftDirty,
} from "./aiReviewFormState";
import {
  designHasAiSuggestions,
  getAiProcessingOutputMessage,
  getQueueDesignLabel,
  resolveAiProcessingOutputStatus,
  resolveAiProcessingPipelineSteps,
} from "./aiProcessingOutput";
import { designMatchesInboxTab, isDesignApprovableInInbox } from "./aiReviewInboxEligibility";
import type { Design } from "../../designs/types/design.types";

function createDesign(overrides: Partial<Design> = {}): Design {
  return {
    id: "design-1",
    title: "Sample Design",
    tags: ["alpha"],
    status: "imported",
    originalPath: "/originals/design-1.png",
    thumbnailPath: "/thumbnails/design-1.webp",
    uploadedBy: "user-1",
    queueCount: 0,
    aiProcessed: false,
    aiReviewed: false,
    aiReviewStatus: "pending",
    createdBy: "user-1",
    updatedBy: "user-1",
    createdAt: { toMillis: () => 1, toDate: () => new Date() } as Design["createdAt"],
    updatedAt: { toMillis: () => 1, toDate: () => new Date() } as Design["updatedAt"],
    ...overrides,
  };
}

describe("aiReviewFormState", () => {
  it("detects dirty draft state", () => {
    const design = createDesign();
    const baseline = createAiReviewDraftFromDesign(design);
    const edited = { ...baseline, title: "Changed title" };

    assert.equal(isAiReviewDraftDirty(baseline, baseline), false);
    assert.equal(isAiReviewDraftDirty(baseline, edited), true);
  });
});

describe("buildAiReviewInboxListQuery", () => {
  it("builds processing tab query", () => {
    const query = buildAiReviewInboxListQuery({ tab: "processing" });

    assert.deepEqual(query.statusIn, ["imported", "processing"]);
    assert.equal(query.aiReviewStatus, "pending");
    assert.equal(query.sortField, "updatedAt");
    assert.equal(query.sortDirection, "desc");
  });

  it("builds needs review tab query", () => {
    const query = buildAiReviewInboxListQuery({ tab: "needs_review" });

    assert.equal(query.status, "imported");
    assert.equal(query.aiReviewStatus, "needs_review");
    assert.equal(query.sortField, "updatedAt");
  });

  it("builds rejected tab query", () => {
    const query = buildAiReviewInboxListQuery({ tab: "rejected" });

    assert.equal(query.status, "rejected");
    assert.equal(query.aiReviewStatus, undefined);
  });
});

describe("getAiReviewEmptyState", () => {
  it("returns tab-specific empty copy", () => {
    assert.match(getAiReviewEmptyState("processing").copy, /currently processing/i);
    assert.match(getAiReviewEmptyState("needs_review").copy, /need review/i);
    assert.match(getAiReviewEmptyState("rejected").copy, /rejected/i);
  });
});

describe("aiProcessingOutput", () => {
  it("does not report suggestions before AI writes them", () => {
    assert.equal(designHasAiSuggestions(createDesign()), false);
    assert.equal(
      designHasAiSuggestions(createDesign({ aiSuggestions: { title: "Name", tags: ["art"] } })),
      true,
    );
  });

  it("returns not_generated for pending imports awaiting staff AI start", () => {
    assert.equal(resolveAiProcessingOutputStatus(createDesign({ aiReviewStatus: "pending" })), "not_generated");
  });

  it("returns waiting when an AI stage is active", () => {
    assert.equal(
      resolveAiProcessingOutputStatus(createDesign({ aiProcessingStage: "queued" })),
      "waiting",
    );
  });

  it("returns ready when suggestions exist", () => {
    assert.equal(
      resolveAiProcessingOutputStatus(
        createDesign({
          aiReviewStatus: "needs_review",
          aiSuggestions: { title: "Suggested title", provider: "development" },
        }),
      ),
      "ready",
    );
  });

  it("returns failed when AI error is present", () => {
    assert.equal(
      resolveAiProcessingOutputStatus(
        createDesign({ aiSuggestions: { errorCode: "ai_processing_failed" } }),
      ),
      "failed",
    );
  });

  it("keeps failed AI output in the processing tab", () => {
    const design = createDesign({
      aiProcessingStage: "failed",
      aiReviewStatus: "pending",
      aiSuggestions: { errorCode: "ai_processing_failed" },
    });

    assert.equal(designMatchesInboxTab(design, "processing"), true);
    assert.equal(designMatchesInboxTab(design, "needs_review"), false);
  });

  it("does not allow failed AI output to be approved from an old needs-review state", () => {
    const design = createDesign({
      aiProcessingStage: "failed",
      aiReviewStatus: "needs_review",
      aiSuggestions: { errorCode: "ai_processing_failed" },
    });

    assert.equal(isDesignApprovableInInbox(design, "needs_review"), false);
  });

  it("returns not_generated when AI output is not available", () => {
    assert.equal(
      resolveAiProcessingOutputStatus(createDesign({ aiReviewStatus: "needs_review" })),
      "not_generated",
    );
  });

  it("returns honest placeholder messages", () => {
    assert.match(getAiProcessingOutputMessage("waiting", createDesign({ aiProcessingStage: "sending_to_ai" })), /sending image to ai/i);
    assert.match(getAiProcessingOutputMessage("not_generated"), /waiting for ai/i);
  });

  it("builds grouped AI processing pipeline steps", () => {
    const design = createDesign({
      aiProcessingStage: "sending_to_ai",
      previewPath: "/previews/design-1.webp",
      thumbnailPath: "/thumbnails/design-1.webp",
    });
    const steps = resolveAiProcessingPipelineSteps(design);

    assert.equal(steps.length, 3);
    assert.equal(steps[0]?.label, "Sending to AI");
    assert.equal(steps[0]?.state, "active");
    assert.equal(steps[1]?.label, "Receiving from AI");
    assert.equal(steps[1]?.state, "pending");
    assert.equal(steps[2]?.label, "Ready for review");
    assert.equal(steps[2]?.state, "pending");
  });

  it("marks receiving group active for validating_response stage", () => {
    const steps = resolveAiProcessingPipelineSteps(
      createDesign({ aiProcessingStage: "validating_response" }),
    );

    assert.equal(steps[0]?.state, "complete");
    assert.equal(steps[1]?.state, "active");
    assert.equal(steps[2]?.state, "pending");
  });

  it("marks failed state on the active pipeline group", () => {
    const steps = resolveAiProcessingPipelineSteps(
      createDesign({
        aiProcessingStage: "failed",
        aiSuggestions: { errorCode: "ai_processing_failed", errorMessage: "Provider timeout" },
      }),
    );

    assert.ok(steps.some((step) => step.state === "failed"));
    assert.equal(steps.filter((step) => step.state === "failed").length, 1);
  });

  it("completes all groups when AI output is ready", () => {
    const steps = resolveAiProcessingPipelineSteps(
      createDesign({
        aiProcessingStage: "ready_for_review",
        aiSuggestions: { title: "Suggested title", provider: "development" },
      }),
    );

    assert.deepEqual(
      steps.map((step) => step.state),
      ["complete", "complete", "complete"],
    );
  });

  it("prefers title but falls back to filename for queue label", () => {
    assert.equal(getQueueDesignLabel(createDesign({ title: "My Design" })), "My Design");
    assert.equal(
      getQueueDesignLabel(createDesign({ title: "", originalPath: "/originals/sample-art.png" })),
      "sample-art.png",
    );
  });
});
