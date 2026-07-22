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
import type { AssistedCreationAnswers } from "../types/assistedCreation/assistedCreation.types";

export interface AssistedCreationAnswerDisplayRow {
  label: string;
  value: string;
}

function labelFromOptions<T extends string>(
  options: ReadonlyArray<{ value: T; label: string }>,
  value: T | string,
): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

function joinLabeledValues(
  values: readonly string[] | undefined,
  labelFn: (value: string) => string,
): string {
  if (!values?.length) {
    return "";
  }
  return values.map(labelFn).join(", ");
}

function pushRow(
  rows: AssistedCreationAnswerDisplayRow[],
  label: string,
  value: string | undefined | null,
): void {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return;
  }
  rows.push({ label, value: trimmed });
}

/** Clean chip-draft mood strings (trailing separators / empties) for display. */
function normalizeCommaSeparatedDisplay(value: string | undefined | null): string {
  if (!value?.trim()) {
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

/**
 * Builds ordered Request-details rows for Portal and Studio.
 * Includes only non-empty values:
 * - strings: non-whitespace after trim
 * - enums: present (labeled)
 * - arrays: length > 0 after labeling
 * - Wording nested fields (exact text, notes + checkboxes): only when
 *   `containsText === "exact_wording"` (matches Portal wizard visibility; avoids
 *   showing preserved draft exactText under other wording modes). Then:
 *   - `textLineBreaksExact`: only when `true`
 *   - `textLayoutFlexible`: `true` → "Layout may be flexible"; `false` → "Keep layout exact"
 * - `referenceUsage`: when non-empty (not bare `hasReferences`)
 *
 * Does not include `rawDescription` (shown as Brief / Description) or reference image
 * metadata (shown in the References section / review file count).
 */
export function buildAssistedCreationAnswerDisplayRows(
  answers: AssistedCreationAnswers | null | undefined,
): AssistedCreationAnswerDisplayRow[] {
  if (!answers) {
    return [];
  }

  const rows: AssistedCreationAnswerDisplayRow[] = [];
  const hasExactWording = answers.containsText === "exact_wording";

  pushRow(
    rows,
    "Request type",
    answers.requestType
      ? labelFromOptions(
          ASSISTED_CREATION_REQUEST_TYPE_OPTIONS,
          answers.requestType as AssistedCreationRequestType,
        )
      : "",
  );
  pushRow(
    rows,
    "Wording",
    answers.containsText
      ? labelFromOptions(
          ASSISTED_CREATION_CONTAINS_TEXT_OPTIONS,
          answers.containsText as AssistedCreationContainsText,
        )
      : "",
  );

  if (hasExactWording) {
    pushRow(rows, "Exact text", answers.exactText);
    pushRow(rows, "Capitalization notes", answers.textCapitalizationNotes);
    pushRow(rows, "Punctuation notes", answers.textPunctuationNotes);

    if (answers.textLineBreaksExact === true) {
      pushRow(rows, "Line breaks", "Keep line breaks exact");
    }

    // Surface layout checkbox for exact-wording requests so true and false both show.
    pushRow(
      rows,
      "Text layout",
      answers.textLayoutFlexible ? "Layout may be flexible" : "Keep layout exact",
    );
  }

  pushRow(rows, "Primary subject", answers.primarySubject);
  pushRow(rows, "Additional subjects", answers.additionalSubjects);
  pushRow(rows, "Action", answers.subjectAction);
  pushRow(rows, "Props", answers.props);
  pushRow(rows, "Setting", answers.setting);
  pushRow(rows, "Occasion", answers.occasion);
  pushRow(rows, "Audience", answers.audience);
  pushRow(
    rows,
    "Personalization",
    joinLabeledValues(answers.personalizationTypes, (value) =>
      labelFromOptions(
        ASSISTED_CREATION_PERSONALIZATION_OPTIONS,
        value as AssistedCreationPersonalizationType,
      ),
    ),
  );
  pushRow(
    rows,
    "Flexibility",
    answers.flexibilityLevel
      ? labelFromOptions(
          ASSISTED_CREATION_FLEXIBILITY_OPTIONS,
          answers.flexibilityLevel as AssistedCreationFlexibilityLevel,
        )
      : "",
  );
  pushRow(
    rows,
    "Must match references",
    joinLabeledValues(answers.exactRequirements, (value) =>
      labelFromOptions(
        ASSISTED_CREATION_EXACT_REQUIREMENT_OPTIONS,
        value as AssistedCreationExactRequirement,
      ),
    ),
  );
  pushRow(
    rows,
    "Styles",
    joinLabeledValues(answers.stylePreferences, (value) =>
      labelFromOptions(ASSISTED_CREATION_STYLE_OPTIONS, value as AssistedCreationStylePreference),
    ),
  );
  pushRow(rows, "Mood", normalizeCommaSeparatedDisplay(answers.mood));
  pushRow(rows, "Colors include", answers.includedColors);
  pushRow(rows, "Colors avoid", answers.excludedColors);
  pushRow(rows, "Garment", answers.garmentColor);
  pushRow(
    rows,
    "Composition",
    answers.composition
      ? labelFromOptions(
          ASSISTED_CREATION_COMPOSITION_OPTIONS,
          answers.composition as AssistedCreationComposition,
        )
      : "",
  );
  pushRow(
    rows,
    "Reference usage",
    joinLabeledValues(answers.referenceUsage, (value) =>
      labelFromOptions(
        ASSISTED_CREATION_REFERENCE_USAGE_OPTIONS,
        value as AssistedCreationReferenceUsage,
      ),
    ),
  );

  return rows;
}
