import {
  CATALOG_SEMANTIC_REVIEW_PROMPT_VERSION,
  SEMANTIC_REVIEW_DECISIONS,
  SEMANTIC_REVIEW_PATCHABLE_FIELDS,
  type SemanticReviewPatch,
  type SemanticReviewResult,
} from "../../../packages/shared/src/types/catalog/semanticReview.types";
import type { VisualContextProfile } from "../../../packages/shared/src/types/catalog/visualContext.types";
import { canRunSemanticReview, getSemanticReviewEligibleBlockers, validateSemanticReviewPatches } from "../../../packages/shared/src/utils/semanticReviewPolicy";

export interface SemanticReviewInput {
  visualContextProfile: VisualContextProfile;
  title?: string;
  description?: string;
  categoryName?: string;
  originalSmartProfile: Record<string, string[]>;
  effectiveSmartProfile: Record<string, string[]>;
  blockers: readonly string[];
}

export function buildSemanticReviewPrompt(input: SemanticReviewInput): string {
  return JSON.stringify({
    promptVersion: CATALOG_SEMANTIC_REVIEW_PROMPT_VERSION,
    instruction: "Review only the eligible semantic blockers against the visual evidence. Never patch title, description, category, visible text, colors, or staff-owned values.",
    visualContextProfile: input.visualContextProfile,
    original: { title: input.title ?? "", description: input.description ?? "", category: input.categoryName ?? "", smartProfile: input.originalSmartProfile },
    effectiveSmartProfile: input.effectiveSmartProfile,
    eligibleBlockers: getSemanticReviewEligibleBlockers(input.blockers),
    patchableFields: SEMANTIC_REVIEW_PATCHABLE_FIELDS,
    decisions: SEMANTIC_REVIEW_DECISIONS,
  });
}

export function parseSemanticReviewResult(raw: unknown): SemanticReviewResult {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Malformed semantic review response.");
  const value = raw as Record<string, unknown>;
  if (!SEMANTIC_REVIEW_DECISIONS.includes(value.decision as never) || typeof value.reason !== "string" || !Array.isArray(value.blockersResolved) || !Array.isArray(value.blockersUnresolved)) {
    throw new Error("Malformed semantic review response.");
  }
  const patches = value.patches as SemanticReviewPatch[] | undefined;
  const validated = validateSemanticReviewPatches(patches);
  if (!validated.valid) throw new Error(validated.reason);
  return { decision: value.decision as SemanticReviewResult["decision"], reason: value.reason.trim(), blockersResolved: value.blockersResolved.filter((v): v is string => typeof v === "string"), blockersUnresolved: value.blockersUnresolved.filter((v): v is string => typeof v === "string"), ...(validated.patches.length ? { patches: validated.patches } : {}) };
}

export function applySemanticReviewPatches(
  profile: Record<string, string[]>,
  result: SemanticReviewResult,
  staffOwnedFields: readonly string[] = [],
): Record<string, string[]> {
  const validated = validateSemanticReviewPatches(result.patches, staffOwnedFields);
  if (!validated.valid) throw new Error(validated.reason);
  const next = { ...profile };
  for (const patch of validated.patches) next[patch.field] = [...patch.to];
  return next;
}

export { canRunSemanticReview };
