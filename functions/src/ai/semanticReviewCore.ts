import {
  CATALOG_SEMANTIC_REVIEW_PROMPT_VERSION,
  SEMANTIC_REVIEW_DECISIONS,
  SEMANTIC_REVIEW_PATCHABLE_FIELDS,
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
    instruction: "Review only the eligible semantic blockers against the visual evidence. Return exactly one JSON object with decision, reason, blockersResolved, blockersUnresolved, and optional patches. Use uppercase decision values exactly as listed. Use [] for no blockers or patches. Never patch title, description, category, visible text, colors, or staff-owned values.",
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
  const decision = typeof value.decision === "string" ? value.decision.trim().toUpperCase() : "";
  if (!SEMANTIC_REVIEW_DECISIONS.includes(decision as typeof SEMANTIC_REVIEW_DECISIONS[number]) || typeof value.reason !== "string" || !value.reason.trim()) {
    throw new Error("Malformed semantic review response.");
  }
  for (const field of ["blockersResolved", "blockersUnresolved"] as const) {
    if (value[field] !== undefined && !Array.isArray(value[field])) throw new Error("Malformed semantic review response.");
  }
  const blockersResolved = (Array.isArray(value.blockersResolved) ? value.blockersResolved : []).filter((v): v is string => typeof v === "string");
  const blockersUnresolved = (Array.isArray(value.blockersUnresolved) ? value.blockersUnresolved : []).filter((v): v is string => typeof v === "string");
  const patches = value.patches === null || value.patches === undefined ? undefined : value.patches;
  if (patches !== undefined && !Array.isArray(patches)) throw new Error("Malformed semantic review response.");
  const validated = validateSemanticReviewPatches(patches);
  if (!validated.valid) throw new Error(validated.reason);
  return { decision: decision as SemanticReviewResult["decision"], reason: value.reason.trim(), blockersResolved, blockersUnresolved, ...(validated.patches.length ? { patches: validated.patches } : {}) };
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
