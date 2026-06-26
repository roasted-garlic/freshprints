import type { Design } from "../../designs/types/design.types";
import { resolveDesignAiReviewDisplay } from "../../designs/utils/aiReviewState";
import { designHasAiSuggestions, resolveAiProcessingOutputStatus } from "./aiProcessingOutput";

export interface NeedsReviewRerunSession {
  designId: string;
  priorGeneratedAt: string | null;
  startedAtMs: number;
}

export function createNeedsReviewRerunSession(design: Design): NeedsReviewRerunSession {
  return {
    designId: design.id,
    priorGeneratedAt: design.aiSuggestions?.generatedAt ?? null,
    startedAtMs: Date.now(),
  };
}

export function isStaleReadyDuringNeedsReviewRerun(
  design: Design,
  session: NeedsReviewRerunSession,
): boolean {
  if (design.id !== session.designId) {
    return false;
  }

  if (resolveAiProcessingOutputStatus(design) !== "ready") {
    return false;
  }

  const generatedAt = design.aiSuggestions?.generatedAt ?? null;

  if (generatedAt && session.priorGeneratedAt) {
    return generatedAt === session.priorGeneratedAt;
  }

  if (generatedAt && !session.priorGeneratedAt) {
    return new Date(generatedAt).getTime() < session.startedAtMs;
  }

  return designHasAiSuggestions(design);
}

export function shouldCompleteNeedsReviewRerun(
  design: Design,
  session: NeedsReviewRerunSession,
): boolean {
  if (design.id !== session.designId) {
    return false;
  }

  const outputStatus = resolveAiProcessingOutputStatus(design);

  if (outputStatus === "failed") {
    return true;
  }

  if (outputStatus !== "ready") {
    return false;
  }

  const review = resolveDesignAiReviewDisplay(design);

  if (review.aiReviewStatus !== "needs_review") {
    return false;
  }

  if (isStaleReadyDuringNeedsReviewRerun(design, session)) {
    return false;
  }

  return designHasAiSuggestions(design);
}
