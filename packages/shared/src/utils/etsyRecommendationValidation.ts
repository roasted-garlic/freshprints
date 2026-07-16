import {
  ETSY_RECOMMENDATION_MAX_OCCASIONS,
  ETSY_RECOMMENDATION_MAX_STYLES,
  ETSY_RECOMMENDATION_MAX_STYLE_TEXT_LENGTH,
  ETSY_RECOMMENDATION_MAX_SUBJECT_TEXT_LENGTH,
  ETSY_RECOMMENDATION_MAX_SUBJECTS,
  ETSY_RECOMMENDATION_MAX_WORDING_LENGTH,
  ETSY_RECOMMENDATION_OCCASION_OPTIONS,
  ETSY_RECOMMENDATION_SCHEMA_VERSION,
  ETSY_RECOMMENDATION_SUBJECT_OPTIONS,
  type EtsyRecommendationOccasionId,
  type EtsyRecommendationSubjectId,
} from "../constants/etsyRecommendation/etsyRecommendation.constants";
import type { EtsyRecommendationAnswers } from "../types/etsyRecommendation/etsyRecommendation.types";
import { parseEtsyRecommendationSubjectText } from "./etsyRecommendationSubjectParser";

const FORBIDDEN_ANSWER_KEYS = [
  "aiStyle",
  "designType",
  "garmentColor",
  "composition",
  "references",
  "rights",
  "authorization",
  "copyright",
  "trademark",
  "franchise",
  "celebrity",
  "personalization",
  "assistedCreation",
  "staffNotes",
  "payment",
] as const;

const SUBJECT_IDS = new Set<string>(ETSY_RECOMMENDATION_SUBJECT_OPTIONS.map((o) => o.id));
const OCCASION_IDS = new Set<string>(ETSY_RECOMMENDATION_OCCASION_OPTIONS.map((o) => o.id));

function asTrimmedString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function rejectForbiddenKeys(raw: Record<string, unknown>): void {
  for (const key of FORBIDDEN_ANSWER_KEYS) {
    if (Object.prototype.hasOwnProperty.call(raw, key) && raw[key] != null && raw[key] !== "") {
      throw new Error(`Unsupported field for Etsy recommendations: ${key}`);
    }
  }
}

function parseLegacySubjects(value: unknown): EtsyRecommendationSubjectId[] | undefined {
  if (value == null) {
    return undefined;
  }
  if (!Array.isArray(value)) {
    throw new Error("Subjects must be a list.");
  }
  if (value.length === 0) {
    return undefined;
  }
  const subjects: EtsyRecommendationSubjectId[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    if (typeof entry !== "string" || !SUBJECT_IDS.has(entry)) {
      throw new Error("Choose valid subjects only.");
    }
    if (seen.has(entry)) {
      continue;
    }
    seen.add(entry);
    subjects.push(entry as EtsyRecommendationSubjectId);
    if (subjects.length > ETSY_RECOMMENDATION_MAX_SUBJECTS) {
      throw new Error(`Choose up to ${ETSY_RECOMMENDATION_MAX_SUBJECTS} subjects.`);
    }
  }
  return subjects.length > 0 ? subjects : undefined;
}

function parseOccasions(value: unknown): EtsyRecommendationOccasionId[] | undefined {
  if (value == null) {
    return undefined;
  }
  if (!Array.isArray(value)) {
    throw new Error("Occasions must be a list.");
  }
  if (value.length === 0) {
    return undefined;
  }
  if (value.length > ETSY_RECOMMENDATION_MAX_OCCASIONS) {
    throw new Error(`Choose up to ${ETSY_RECOMMENDATION_MAX_OCCASIONS} occasion.`);
  }
  const occasions: EtsyRecommendationOccasionId[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    if (typeof entry !== "string" || !OCCASION_IDS.has(entry)) {
      throw new Error("Choose a valid occasion.");
    }
    if (seen.has(entry)) {
      continue;
    }
    seen.add(entry);
    occasions.push(entry as EtsyRecommendationOccasionId);
  }
  return occasions.length > 0 ? occasions : undefined;
}

function parseStyles(value: unknown): string[] | undefined {
  if (value == null) {
    return undefined;
  }
  if (!Array.isArray(value)) {
    throw new Error("Tone / style must be a list.");
  }
  const styles: string[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    if (typeof entry !== "string") {
      throw new Error("Tone / style must be text.");
    }
    const trimmed = entry.trim().replace(/\s+/g, " ");
    if (!trimmed) {
      continue;
    }
    if (trimmed.length > ETSY_RECOMMENDATION_MAX_STYLE_TEXT_LENGTH) {
      throw new Error(
        `Tone / style must be ${ETSY_RECOMMENDATION_MAX_STYLE_TEXT_LENGTH} characters or fewer.`,
      );
    }
    const key = trimmed.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    styles.push(trimmed);
    if (styles.length > ETSY_RECOMMENDATION_MAX_STYLES) {
      throw new Error(`Choose up to ${ETSY_RECOMMENDATION_MAX_STYLES} styles.`);
    }
  }
  return styles.length > 0 ? styles : undefined;
}

/**
 * Validates hybrid (subjectText) or legacy curated (subjects) answers.
 */
export function parseEtsyRecommendationAnswers(input: unknown): EtsyRecommendationAnswers {
  if (input == null || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Answers are required.");
  }

  const raw = input as Record<string, unknown>;
  rejectForbiddenKeys(raw);

  const subjectText = asTrimmedString(raw.subjectText);
  if (subjectText && subjectText.length > ETSY_RECOMMENDATION_MAX_SUBJECT_TEXT_LENGTH) {
    throw new Error(
      `Subject must be ${ETSY_RECOMMENDATION_MAX_SUBJECT_TEXT_LENGTH} characters or fewer.`,
    );
  }
  if (subjectText) {
    // Ensure the free-text path parses into usable tokens.
    parseEtsyRecommendationSubjectText(subjectText);
  }

  const subjects = parseLegacySubjects(raw.subjects);
  const styles = parseStyles(raw.styles);
  const occasions = parseOccasions(raw.occasions);

  if (!subjectText && (!subjects || subjects.length === 0)) {
    throw new Error("Describe what the design is of.");
  }

  const wording = asTrimmedString(raw.wording);
  if (wording && wording.length > ETSY_RECOMMENDATION_MAX_WORDING_LENGTH) {
    throw new Error(`Exact saying must be ${ETSY_RECOMMENDATION_MAX_WORDING_LENGTH} characters or fewer.`);
  }

  const answers: EtsyRecommendationAnswers = {};
  if (subjectText) {
    answers.subjectText = subjectText;
  }
  if (subjects) {
    answers.subjects = subjects;
  }
  if (styles) {
    answers.styles = styles;
  }
  if (occasions) {
    answers.occasions = occasions;
  }
  if (wording) {
    answers.wording = wording;
  }
  return answers;
}

export function assertEtsyRecommendationSchemaVersion(value: unknown): asserts value is 1 {
  if (value !== ETSY_RECOMMENDATION_SCHEMA_VERSION) {
    throw new Error("Unsupported Etsy recommendation schema version.");
  }
}

/** Strip undefined so Firestore writes never include undefined fields. */
export function answersForFirestore(
  answers: EtsyRecommendationAnswers,
): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  if (answers.subjectText) {
    out.subjectText = answers.subjectText;
  }
  if (answers.subjects && answers.subjects.length > 0) {
    out.subjects = [...answers.subjects];
  }
  if (answers.styles && answers.styles.length > 0) {
    out.styles = [...answers.styles];
  }
  if (answers.occasions && answers.occasions.length > 0) {
    out.occasions = [...answers.occasions];
  }
  if (answers.wording) {
    out.wording = answers.wording;
  }
  return out;
}

export function getSubjectLabel(subjectId: EtsyRecommendationSubjectId): string {
  const match = ETSY_RECOMMENDATION_SUBJECT_OPTIONS.find((option) => option.id === subjectId);
  return match?.label ?? subjectId;
}

export function getSubjectApiToken(subjectId: EtsyRecommendationSubjectId): string {
  const match = ETSY_RECOMMENDATION_SUBJECT_OPTIONS.find((option) => option.id === subjectId);
  return match?.apiToken ?? subjectId.replace(/_/g, " ");
}

export function getOccasionLabel(occasionId: EtsyRecommendationOccasionId): string {
  const match = ETSY_RECOMMENDATION_OCCASION_OPTIONS.find((option) => option.id === occasionId);
  return match?.label ?? occasionId;
}

export function getOccasionApiToken(occasionId: EtsyRecommendationOccasionId): string {
  const match = ETSY_RECOMMENDATION_OCCASION_OPTIONS.find((option) => option.id === occasionId);
  return match?.apiToken ?? occasionId.replace(/_/g, " ");
}
