import {
  CATALOG_SEMANTIC_REVIEW_PROMPT_VERSION,
  SEMANTIC_REVIEW_DECISIONS,
  SEMANTIC_REVIEW_PATCHABLE_FIELDS,
  type SemanticReviewPatch,
  type SemanticReviewResult,
} from "../../../packages/shared/src/types/catalog/semanticReview.types";
import type { VisualContextProfile } from "../../../packages/shared/src/types/catalog/visualContext.types";
import {
  canRunSemanticReview,
  describeSemanticReviewBlockers,
  getSemanticReviewEligibleBlockers,
  validateSemanticReviewPatches,
} from "../../../packages/shared/src/utils/semanticReviewPolicy";
import { normalizeSmartProfileStringList } from "../../../packages/shared/src/utils/smartProfileNormalization";
import { smartCanonicalKey } from "../../../packages/shared/src/utils/smartCanonicalKey";

export type SemanticReviewValidationStage =
  | "semantic_result_validation"
  | "patch_validation";

export interface SemanticReviewPatchValidationSnapshot {
  currentSmartProfile: Record<string, string[]>;
  rawProviderPatch?: unknown;
  parsedPatch?: SemanticReviewPatch[];
  canonicalFrom?: Array<{ field: string; values: string[] }>;
  canonicalTo?: Array<{ field: string; values: string[] }>;
  validationResult?: {
    valid: boolean;
    patches: SemanticReviewPatch[];
    reason?: string;
  };
}

export class SemanticReviewValidationError extends Error {
  readonly stage: SemanticReviewValidationStage;
  readonly validationFault: string;
  readonly patchValidation?: SemanticReviewPatchValidationSnapshot;

  constructor(
    stage: SemanticReviewValidationStage,
    message: string,
    validationFault = "malformed_response",
    patchValidation?: SemanticReviewPatchValidationSnapshot,
  ) {
    super(message);
    this.name = "SemanticReviewValidationError";
    this.stage = stage;
    this.validationFault = validationFault;
    this.patchValidation = patchValidation;
  }
}

export interface SemanticReviewInput {
  visualContextProfile: VisualContextProfile;
  title?: string;
  description?: string;
  categoryName?: string;
  originalSmartProfile: unknown;
  effectiveSmartProfile: unknown;
  blockers: readonly string[];
}

function toSmartProfileRecord(value: unknown): Record<string, string[]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).flatMap(([key, raw]) =>
      Array.isArray(raw) && raw.every((item) => typeof item === "string")
        ? [[key, [...raw] as string[]]]
        : [],
    ),
  );
}

export function buildSemanticReviewPrompt(input: SemanticReviewInput): string {
  const eligibleBlockers = getSemanticReviewEligibleBlockers(input.blockers);
  const currentSmartProfile = toSmartProfileRecord(input.effectiveSmartProfile);
  return JSON.stringify({
    promptVersion: CATALOG_SEMANTIC_REVIEW_PROMPT_VERSION,
    instruction:
      "Your only job is to resolve the eligible semantic blockers that prevented Pass 1 from reaching Ready. Never infer blocker meaning from raw reason-code wording; read the supplied eligibleBlockerDetails. A structured_evidence_gap means the named value is already present in the named Smart Profile field, and deterministic evidence is insufficient to support retaining it; it does not mean the field is missing that value. Compare current field values with the desired target before proposing a patch. Never return APPROVE_WITH_PATCH with a target canonically equivalent to the current field. Remove or replace unsupported values only when the supplied evidence supports that mutation. For subject_specificity_risk, use grounded specificity supported by the supplied context rather than duplicating or re-adding the generic subject. If no safe mutation can clear a blocker, return NEEDS_REVIEW with no patches. Do not make unrelated cosmetic edits. Reviewer blockersResolved and blockersUnresolved are audit-only; Fresh Prints recomputes deterministic authority and final WAA after any accepted patch. Return exactly one JSON object matching the supplied catalog_semantic_review_v4 schema. When patches are needed, return patches as a patch map object keyed only by approved patchable Smart Profile dimensions; each value must be the complete desired string array for that dimension. Do not return patch arrays or field/value patch objects. Use uppercase decision values exactly as listed. Use [] for no blockers. Omit patches when no patch is needed. Never patch title, description, category, visible text, colors, or staff-owned values.",
    visualContextProfile: input.visualContextProfile,
    original: {
      title: input.title ?? "",
      description: input.description ?? "",
      category: input.categoryName ?? "",
      smartProfile: input.originalSmartProfile,
    },
    effectiveSmartProfile: input.effectiveSmartProfile,
    eligibleBlockers,
    eligibleBlockerDetails: describeSemanticReviewBlockers({
      blockers: eligibleBlockers,
      currentSmartProfile,
    }),
    patchableFields: SEMANTIC_REVIEW_PATCHABLE_FIELDS,
    decisions: SEMANTIC_REVIEW_DECISIONS,
  });
}

export function parseSemanticReviewResultWithDiagnostics(
  raw: unknown,
  currentSmartProfile: Record<string, string[]> = {},
): { result: SemanticReviewResult; patchValidation: SemanticReviewPatchValidationSnapshot } {
  const patchValidation: SemanticReviewPatchValidationSnapshot = {
    currentSmartProfile: clonePatchProfile(currentSmartProfile),
  };
  const fail = (
    stage: SemanticReviewValidationStage,
    message: string,
    validationFault: string,
  ): never => {
    throw new SemanticReviewValidationError(
      stage,
      message,
      validationFault,
      patchValidation,
    );
  };
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    fail(
      "semantic_result_validation",
      "Malformed semantic review response.",
      "result_not_object",
    );
  const value = raw as Record<string, unknown>;
  const decision =
    typeof value.decision === "string"
      ? value.decision.trim().toUpperCase()
      : "";
  if (
    !SEMANTIC_REVIEW_DECISIONS.includes(
      decision as (typeof SEMANTIC_REVIEW_DECISIONS)[number],
    )
  ) {
    fail(
      "semantic_result_validation",
      "Malformed semantic review response.",
      "invalid_decision",
    );
  }
  if (typeof value.reason !== "string" || !value.reason.trim()) {
    fail(
      "semantic_result_validation",
      "Malformed semantic review response.",
      "missing_or_empty_reason",
    );
  }
  const reason = typeof value.reason === "string" ? value.reason.trim() : "";
  for (const field of ["blockersResolved", "blockersUnresolved"] as const) {
    if (value[field] !== undefined && !Array.isArray(value[field]))
      fail(
        "semantic_result_validation",
        "Malformed semantic review response.",
        `${field}_not_array`,
      );
  }
  const blockersResolved = (
    Array.isArray(value.blockersResolved) ? value.blockersResolved : []
  ).filter((v): v is string => typeof v === "string");
  const blockersUnresolved = (
    Array.isArray(value.blockersUnresolved) ? value.blockersUnresolved : []
  ).filter((v): v is string => typeof v === "string");
  const rawPatches =
    value.patches === null || value.patches === undefined
      ? undefined
      : value.patches;
  patchValidation.rawProviderPatch = rawPatches;
  let patches: SemanticReviewPatch[] | undefined;
  if (rawPatches !== undefined && Array.isArray(rawPatches)) {
    patches = rawPatches as SemanticReviewPatch[];
  } else if (
    rawPatches !== undefined &&
    rawPatches &&
    typeof rawPatches === "object" &&
    !Array.isArray(rawPatches)
  ) {
    const patchMap = rawPatches as Record<string, unknown>;
    const order = SEMANTIC_REVIEW_PATCHABLE_FIELDS.filter((field) =>
      Object.prototype.hasOwnProperty.call(patchMap, field),
    );
    if (
      order.length !== Object.keys(patchMap).length ||
      order.some(
        (field) =>
          !Array.isArray(patchMap[field]) ||
          (patchMap[field] as unknown[]).some(
            (item) => typeof item !== "string",
          ) ||
          !Array.isArray(currentSmartProfile[field]),
      )
    ) {
      fail(
        "semantic_result_validation",
        "Malformed semantic review response.",
        "invalid_patch_map",
      );
    }
    patches = order.map((field) => ({
      field,
      from: [...currentSmartProfile[field]],
      to: [...(patchMap[field] as string[])],
    }));
  } else if (rawPatches !== undefined) {
    fail(
      "semantic_result_validation",
      "Malformed semantic review response.",
      "invalid_patches_shape",
    );
  }
  patchValidation.parsedPatch = patches;
  patchValidation.canonicalFrom = canonicalPatchValues(patches, "from");
  patchValidation.canonicalTo = canonicalPatchValues(patches, "to");
  const validated = validateSemanticReviewPatches(
    patches,
    [],
    currentSmartProfile,
  );
  patchValidation.validationResult = {
    valid: validated.valid,
    patches: validated.patches,
    ...(validated.reason ? { reason: validated.reason } : {}),
  };
  if (!validated.valid) {
    fail(
      "patch_validation",
      validated.reason ?? "Invalid semantic review patch.",
      "patch_validation_failed",
    );
  }
  return {
    result: {
      decision: decision as SemanticReviewResult["decision"],
      reason,
      blockersResolved,
      blockersUnresolved,
      ...(validated.patches.length ? { patches: validated.patches } : {}),
    },
    patchValidation,
  };
}

export function parseSemanticReviewResult(
  raw: unknown,
  currentSmartProfile: Record<string, string[]> = {},
): SemanticReviewResult {
  return parseSemanticReviewResultWithDiagnostics(raw, currentSmartProfile).result;
}

function clonePatchProfile(profile: Record<string, string[]>): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(profile).map(([field, values]) => [field, [...values]]),
  );
}

function canonicalPatchValues(
  patches: SemanticReviewPatch[] | undefined,
  side: "from" | "to",
): Array<{ field: string; values: string[] }> {
  return (patches ?? []).map((patch) => ({
    field: patch.field,
    values: (normalizeSmartProfileStringList(patch[side]) ?? [])
      .map((value) => smartCanonicalKey(value))
      .filter(Boolean)
      .sort(),
  }));
}

export function applySemanticReviewPatches(
  profile: Record<string, string[]>,
  result: SemanticReviewResult,
  staffOwnedFields: readonly string[] = [],
): Record<string, string[]> {
  const validated = validateSemanticReviewPatches(
    result.patches,
    staffOwnedFields,
    profile,
  );
  if (!validated.valid) {
    throw new SemanticReviewValidationError(
      "patch_validation",
      validated.reason ?? "Invalid semantic review patch.",
    );
  }
  const next = { ...profile };
  for (const patch of validated.patches) next[patch.field] = [...patch.to];
  return next;
}

export { canRunSemanticReview };
