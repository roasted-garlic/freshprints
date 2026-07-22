import {
  ASSISTED_CREATION_COMPOSITION_OPTIONS,
  ASSISTED_CREATION_CONTAINS_TEXT_OPTIONS,
  ASSISTED_CREATION_EXACT_REQUIREMENT_OPTIONS,
  ASSISTED_CREATION_FLEXIBILITY_OPTIONS,
  ASSISTED_CREATION_PERSONALIZATION_OPTIONS,
  ASSISTED_CREATION_REFERENCE_USAGE_OPTIONS,
  ASSISTED_CREATION_REQUEST_TYPE_OPTIONS,
  ASSISTED_CREATION_STYLE_OPTIONS,
  type AssistedCreationComposition,
  type AssistedCreationContainsText,
  type AssistedCreationExactRequirement,
  type AssistedCreationFlexibilityLevel,
  type AssistedCreationPersonalizationType,
  type AssistedCreationReferenceUsage,
  type AssistedCreationRequestType,
  type AssistedCreationStylePreference,
} from "../constants/assistedCreation/assistedCreation.constants";
import type {
  AssistedCreationAnswers,
  AssistedCreationFulfillmentMode,
  AssistedCreationReferenceImage,
  AssistedCreationRequest,
} from "../types/assistedCreation/assistedCreation.types";

export const ASSISTED_CREATION_AI_CONTEXT_SCHEMA_VERSION = 1 as const;

/**
 * Stable 1-based staff / AI Context label for a reference image in array order.
 * Used in AI Context JSON and Studio download basenames (`REFERENCE_IMAGE_1`, …).
 * Electron save may append a MIME-derived extension when the basename has none.
 */
export function buildAssistedCreationReferenceImageLabel(zeroBasedIndex: number): string {
  const n = Number.isFinite(zeroBasedIndex) ? Math.max(0, Math.floor(zeroBasedIndex)) : 0;
  return `REFERENCE_IMAGE_${n + 1}`;
}

export interface AssistedCreationAiContextProfileInput {
  id: string;
  fulfillmentMode?: AssistedCreationFulfillmentMode | null;
  answers: AssistedCreationAnswers | null | undefined;
  referenceImages?: readonly AssistedCreationReferenceImage[] | null;
}

type JsonObject = Record<string, unknown>;

function labelFromOptions<T extends string>(
  options: ReadonlyArray<{ value: T; label: string }>,
  value: T | string,
): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

function trimOrEmpty(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeMood(value: string): string {
  if (!value.trim()) {
    return "";
  }
  const seen = new Set<string>();
  const parts: string[] = [];
  for (const part of value.split(",")) {
    const trimmed = part.trim();
    if (!trimmed) {
      continue;
    }
    const key = trimmed.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    parts.push(trimmed);
  }
  return parts.join(", ");
}

function setIfPresent(target: JsonObject, key: string, value: unknown): void {
  if (value == null) {
    return;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }
    target[key] = trimmed;
    return;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return;
    }
    target[key] = value;
    return;
  }
  if (typeof value === "boolean") {
    target[key] = value;
    return;
  }
  target[key] = value;
}

function labeledReferenceUsage(
  values: readonly AssistedCreationReferenceUsage[] | undefined,
): string[] {
  if (!values?.length) {
    return [];
  }
  return values.map((value) =>
    labelFromOptions(ASSISTED_CREATION_REFERENCE_USAGE_OPTIONS, value),
  );
}

function buildCustomerSubmission(answers: AssistedCreationAnswers): JsonObject {
  const submission: JsonObject = {};
  setIfPresent(submission, "raw_description", answers.rawDescription);
  if (answers.requestType) {
    setIfPresent(
      submission,
      "request_type",
      labelFromOptions(ASSISTED_CREATION_REQUEST_TYPE_OPTIONS, answers.requestType),
    );
  }
  if (answers.containsText) {
    setIfPresent(
      submission,
      "contains_text",
      answers.containsText,
    );
  }

  const exactWording = answers.containsText === "exact_wording";
  if (exactWording) {
    const exact = trimOrEmpty(answers.exactText);
    if (exact) {
      submission.exact_text = [exact];
    }
    setIfPresent(submission, "text_capitalization_notes", answers.textCapitalizationNotes);
    setIfPresent(submission, "text_punctuation_notes", answers.textPunctuationNotes);
    if (answers.textLineBreaksExact === true) {
      submission.text_line_breaks_exact = true;
    }
    if (typeof answers.textLayoutFlexible === "boolean") {
      submission.text_layout_flexible = answers.textLayoutFlexible;
    }
  }

  setIfPresent(submission, "primary_subject", answers.primarySubject);
  setIfPresent(submission, "additional_subjects", answers.additionalSubjects);
  setIfPresent(submission, "subject_action", answers.subjectAction);
  setIfPresent(submission, "props", answers.props);
  setIfPresent(submission, "setting", answers.setting);
  setIfPresent(submission, "occasion", answers.occasion);
  setIfPresent(submission, "audience", answers.audience);

  if (answers.personalizationTypes?.length) {
    submission.personalization_types = answers.personalizationTypes.map((value) =>
      labelFromOptions(
        ASSISTED_CREATION_PERSONALIZATION_OPTIONS,
        value as AssistedCreationPersonalizationType,
      ),
    );
  }
  if (answers.exactRequirements?.length) {
    submission.exact_requirements = answers.exactRequirements.map((value) =>
      labelFromOptions(
        ASSISTED_CREATION_EXACT_REQUIREMENT_OPTIONS,
        value as AssistedCreationExactRequirement,
      ),
    );
  }
  if (answers.flexibilityLevel) {
    setIfPresent(
      submission,
      "flexibility_level",
      labelFromOptions(
        ASSISTED_CREATION_FLEXIBILITY_OPTIONS,
        answers.flexibilityLevel as AssistedCreationFlexibilityLevel,
      ),
    );
  }
  if (answers.stylePreferences?.length) {
    submission.style_preferences = answers.stylePreferences.map((value) =>
      labelFromOptions(ASSISTED_CREATION_STYLE_OPTIONS, value as AssistedCreationStylePreference),
    );
  }
  setIfPresent(submission, "mood", normalizeMood(answers.mood ?? ""));
  setIfPresent(submission, "included_colors", answers.includedColors);
  setIfPresent(submission, "excluded_colors", answers.excludedColors);
  setIfPresent(submission, "garment_color", answers.garmentColor);
  if (answers.composition) {
    setIfPresent(
      submission,
      "composition",
      answers.composition as AssistedCreationComposition,
    );
  }
  const usage = labeledReferenceUsage(answers.referenceUsage);
  if (usage.length > 0) {
    submission.reference_usage = answers.referenceUsage;
  }
  return submission;
}

function buildDesignBrief(answers: AssistedCreationAnswers): JsonObject {
  const brief: JsonObject = {};
  setIfPresent(brief, "concept", answers.rawDescription);

  const requiredVisuals: string[] = [];
  const primary = trimOrEmpty(answers.primarySubject);
  const action = trimOrEmpty(answers.subjectAction);
  const additional = trimOrEmpty(answers.additionalSubjects);
  const props = trimOrEmpty(answers.props);
  const setting = trimOrEmpty(answers.setting);
  if (primary) {
    requiredVisuals.push(primary);
  }
  if (action) {
    requiredVisuals.push(action);
  }
  if (additional) {
    requiredVisuals.push(additional);
  }
  if (props) {
    requiredVisuals.push(props);
  }
  if (setting) {
    requiredVisuals.push(setting);
  }
  if (requiredVisuals.length > 0) {
    brief.required_visuals = requiredVisuals;
  }

  const styleDirection: string[] = [];
  for (const style of answers.stylePreferences ?? []) {
    styleDirection.push(
      labelFromOptions(ASSISTED_CREATION_STYLE_OPTIONS, style as AssistedCreationStylePreference),
    );
  }
  const mood = normalizeMood(answers.mood ?? "");
  if (mood) {
    for (const part of mood.split(",").map((p) => p.trim()).filter(Boolean)) {
      styleDirection.push(part);
    }
  }
  if (styleDirection.length > 0) {
    brief.style_direction = styleDirection;
  }

  const colorDirection: string[] = [];
  const included = trimOrEmpty(answers.includedColors);
  const excluded = trimOrEmpty(answers.excludedColors);
  if (included) {
    colorDirection.push(`include: ${included}`);
  }
  if (excluded) {
    colorDirection.push(`avoid: ${excluded}`);
  }
  if (colorDirection.length > 0) {
    brief.color_direction = colorDirection;
  }

  if (answers.composition && answers.composition !== "no_preference") {
    setIfPresent(
      brief,
      "layout_direction",
      labelFromOptions(
        ASSISTED_CREATION_COMPOSITION_OPTIONS,
        answers.composition as AssistedCreationComposition,
      ),
    );
  }

  const mustAvoid: string[] = [];
  if (excluded) {
    mustAvoid.push(excluded);
  }
  if (mustAvoid.length > 0) {
    brief.must_avoid = mustAvoid;
  }

  if (answers.containsText === "exact_wording") {
    const exact = trimOrEmpty(answers.exactText);
    if (exact) {
      brief.required_wording = [exact];
    }
  }

  return brief;
}

const OUTPUT_REQUIREMENTS = {
  format: "PNG",
  background: "pure white",
  target_quality: "high-resolution DTF-ready artwork",
  maximum_canvas: "12 x 12 inches",
  rendering_style: "clean vector-style illustration",
  color_method: "flat solid colors with clearly separated fills",
} as const;

/**
 * Pure mapper: Assisted Creation request → AI-ready JSON profile.
 * Never includes URLs, Storage paths, UIDs, email, staff notes, or image bytes.
 */
export function buildAssistedCreationAiContextProfile(
  input: AssistedCreationAiContextProfileInput | Pick<
    AssistedCreationRequest,
    "id" | "answers" | "referenceImages" | "fulfillmentMode"
  >,
): { image_context_profile: JsonObject } {
  const answers = input.answers;
  const requestId = typeof input.id === "string" ? input.id.trim() : "";
  const fulfillmentMode =
    input.fulfillmentMode === "catalog_share" || input.fulfillmentMode === "proof_image"
      ? input.fulfillmentMode
      : "proof_image";
  const references = Array.isArray(input.referenceImages) ? input.referenceImages : [];

  const requestSummary: JsonObject = {
    request_id: requestId,
    fulfillment_mode: fulfillmentMode,
  };
  if (answers?.requestType) {
    requestSummary.selected_path = answers.requestType as AssistedCreationRequestType;
  }
  // title intentionally omitted (no request title field; do not invent from description)

  const profile: JsonObject = {
    schema_version: ASSISTED_CREATION_AI_CONTEXT_SCHEMA_VERSION,
    type: "graphic design",
    use_case: "DTF transfer / apparel print",
    request_summary: requestSummary,
    output_requirements: { ...OUTPUT_REQUIREMENTS },
  };

  if (answers) {
    const submission = buildCustomerSubmission(answers);
    if (Object.keys(submission).length > 0) {
      profile.customer_submission = submission;
    }
    const brief = buildDesignBrief(answers);
    if (Object.keys(brief).length > 0) {
      profile.design_brief = brief;
    }
  }

  if (references.length > 0) {
    const usageLabels = labeledReferenceUsage(answers?.referenceUsage);
    const usageJoined = usageLabels.join(", ");
    profile.reference_images = references.map((_, index) => {
      const entry: JsonObject = {
        reference: buildAssistedCreationReferenceImageLabel(index),
      };
      if (usageJoined) {
        entry.usage = usageJoined;
      }
      return entry;
    });
  }

  return { image_context_profile: profile };
}

/** Loose type guards used only in tests / callers that want labels. */
export function assistedCreationContainsTextLabel(value: AssistedCreationContainsText): string {
  return labelFromOptions(ASSISTED_CREATION_CONTAINS_TEXT_OPTIONS, value);
}
