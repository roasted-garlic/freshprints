import type {
  AiReviewMutationInput,
  AiReviewStateFields,
  AiReviewStatus,
  DesignAiReviewSource,
  ResolvedDesignAiReviewDisplay,
} from "../types/aiReview.types";

const MAX_AI_REVIEW_NOTES_LENGTH = 2000;
const MAX_AI_REVIEW_VERSION_LENGTH = 80;

function clampConfidence(value: number | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Number.isFinite(value)) {
    throw new Error("AI review confidence must be a finite number.");
  }

  if (value < 0 || value > 1) {
    throw new Error("AI review confidence must be between 0 and 1.");
  }

  return value;
}

function normalizeOptionalNotes(notes: string | undefined): string | undefined {
  if (notes === undefined) {
    return undefined;
  }

  const trimmedNotes = notes.trim();

  if (!trimmedNotes) {
    return undefined;
  }

  if (trimmedNotes.length > MAX_AI_REVIEW_NOTES_LENGTH) {
    throw new Error(`AI review notes must be ${MAX_AI_REVIEW_NOTES_LENGTH} characters or fewer.`);
  }

  return trimmedNotes;
}

function normalizeOptionalVersion(version: string | undefined): string | undefined {
  if (version === undefined) {
    return undefined;
  }

  const trimmedVersion = version.trim();

  if (!trimmedVersion) {
    return undefined;
  }

  if (trimmedVersion.length > MAX_AI_REVIEW_VERSION_LENGTH) {
    throw new Error(
      `AI review version must be ${MAX_AI_REVIEW_VERSION_LENGTH} characters or fewer.`,
    );
  }

  return trimmedVersion;
}

function normalizeMutationInput(input: AiReviewMutationInput = {}): {
  aiReviewVersion?: string;
  aiReviewNotes?: string;
  aiReviewConfidence?: number;
} {
  return {
    aiReviewVersion: normalizeOptionalVersion(input.aiReviewVersion),
    aiReviewNotes: normalizeOptionalNotes(input.aiReviewNotes),
    aiReviewConfidence: clampConfidence(input.aiReviewConfidence),
  };
}

export function buildAiReviewPendingFields(
  input: AiReviewMutationInput = {},
): Pick<
  AiReviewStateFields,
  "aiReviewStatus" | "aiReviewed" | "aiProcessed" | "aiReviewVersion" | "aiReviewNotes"
> {
  const normalized = normalizeMutationInput(input);

  return {
    aiReviewStatus: "pending",
    aiReviewed: false,
    aiProcessed: false,
    aiReviewVersion: normalized.aiReviewVersion,
    aiReviewNotes: normalized.aiReviewNotes,
  };
}

export function buildAiReviewApprovedFields(
  reviewerId: string,
  input: AiReviewMutationInput = {},
): AiReviewStateFields {
  const normalized = normalizeMutationInput(input);

  return {
    aiReviewStatus: "approved",
    aiReviewed: true,
    aiProcessed: true,
    aiReviewedBy: reviewerId,
    aiReviewVersion: normalized.aiReviewVersion,
    aiReviewNotes: normalized.aiReviewNotes,
    aiReviewConfidence: normalized.aiReviewConfidence,
  };
}

export function buildAiReviewRejectedFields(
  reviewerId: string,
  input: AiReviewMutationInput = {},
): AiReviewStateFields {
  const normalized = normalizeMutationInput(input);

  return {
    aiReviewStatus: "rejected",
    aiReviewed: false,
    aiProcessed: true,
    aiReviewedBy: reviewerId,
    aiReviewVersion: normalized.aiReviewVersion,
    aiReviewNotes: normalized.aiReviewNotes,
    aiReviewConfidence: normalized.aiReviewConfidence,
  };
}

export function buildAiReviewNeedsReviewFields(
  reviewerId: string,
  input: AiReviewMutationInput = {},
): AiReviewStateFields {
  const normalized = normalizeMutationInput(input);

  return {
    aiReviewStatus: "needs_review",
    aiReviewed: false,
    aiProcessed: true,
    aiReviewedBy: reviewerId,
    aiReviewVersion: normalized.aiReviewVersion,
    aiReviewNotes: normalized.aiReviewNotes,
    aiReviewConfidence: normalized.aiReviewConfidence,
  };
}

/**
 * Resolves AI review values for read-only display.
 * Legacy imports without `aiReviewStatus` display as pending when still in the import pipeline.
 */
export function resolveDesignAiReviewDisplay(
  design: DesignAiReviewSource,
): ResolvedDesignAiReviewDisplay {
  if (design.aiReviewStatus) {
    return {
      aiReviewStatus: design.aiReviewStatus,
      aiReviewed: design.aiReviewed,
      aiProcessed: design.aiProcessed,
      aiReviewedAt: design.aiReviewedAt,
      aiReviewedBy: design.aiReviewedBy,
      aiReviewVersion: design.aiReviewVersion,
      aiReviewNotes: design.aiReviewNotes,
      aiReviewConfidence: design.aiReviewConfidence,
      usesDisplayFallback: false,
    };
  }

  if (design.aiReviewed) {
    return {
      aiReviewStatus: "approved",
      aiReviewed: true,
      aiProcessed: design.aiProcessed,
      aiReviewedAt: design.aiReviewedAt,
      aiReviewedBy: design.aiReviewedBy,
      aiReviewVersion: design.aiReviewVersion,
      aiReviewNotes: design.aiReviewNotes,
      aiReviewConfidence: design.aiReviewConfidence,
      usesDisplayFallback: true,
    };
  }

  if (design.status === "imported" || design.status === "processing") {
    return {
      aiReviewStatus: "pending",
      aiReviewed: false,
      aiProcessed: design.aiProcessed,
      usesDisplayFallback: true,
    };
  }

  return {
    aiReviewStatus: "pending",
    aiReviewed: design.aiReviewed,
    aiProcessed: design.aiProcessed,
    usesDisplayFallback: true,
  };
}

export function isAiReviewEligibleForReady(aiReviewStatus: AiReviewStatus): boolean {
  return aiReviewStatus === "approved";
}
