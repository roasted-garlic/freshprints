import {
  ASSISTED_CREATION_ALLOWED_REFERENCE_TYPES,
  ASSISTED_CREATION_ANSWERS_VERSION,
  ASSISTED_CREATION_COMPOSITION_OPTIONS,
  ASSISTED_CREATION_CONTAINS_TEXT_OPTIONS,
  ASSISTED_CREATION_EXACT_REQUIREMENT_OPTIONS,
  ASSISTED_CREATION_FIELD_LIMITS,
  ASSISTED_CREATION_FLEXIBILITY_OPTIONS,
  ASSISTED_CREATION_MAX_MOOD_ITEMS,
  ASSISTED_CREATION_MAX_REFERENCE_BYTES,
  ASSISTED_CREATION_MAX_REFERENCE_IMAGES,
  ASSISTED_CREATION_MAX_STYLE_PREFERENCES,
  ASSISTED_CREATION_PERSONALIZATION_OPTIONS,
  ASSISTED_CREATION_RATING_MAX,
  ASSISTED_CREATION_RATING_MIN,
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
  AssistedCreationCustomerRating,
} from "../types/assistedCreation/assistedCreation.types";

const REQUEST_TYPES = new Set<string>(
  ASSISTED_CREATION_REQUEST_TYPE_OPTIONS.map((o) => o.value),
);
const CONTAINS_TEXT = new Set<string>(
  ASSISTED_CREATION_CONTAINS_TEXT_OPTIONS.map((o) => o.value),
);
const FLEXIBILITY = new Set<string>(
  ASSISTED_CREATION_FLEXIBILITY_OPTIONS.map((o) => o.value),
);
const COMPOSITIONS = new Set<string>(
  ASSISTED_CREATION_COMPOSITION_OPTIONS.map((o) => o.value),
);
const PERSONALIZATION = new Set<string>(
  ASSISTED_CREATION_PERSONALIZATION_OPTIONS.map((o) => o.value),
);
const EXACT_REQUIREMENTS = new Set<string>(
  ASSISTED_CREATION_EXACT_REQUIREMENT_OPTIONS.map((o) => o.value),
);
const STYLES = new Set<string>(ASSISTED_CREATION_STYLE_OPTIONS.map((o) => o.value));
const REFERENCE_USAGE = new Set<string>(
  ASSISTED_CREATION_REFERENCE_USAGE_OPTIONS.map((o) => o.value),
);
const ALLOWED_REFERENCE_TYPES = new Set<string>(ASSISTED_CREATION_ALLOWED_REFERENCE_TYPES);

function asObject(value: unknown, label: string): Record<string, unknown> {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function asTrimmedString(value: unknown, label: string, max: number, required: boolean): string {
  if (value == null || value === "") {
    if (required) {
      throw new Error(`${label} is required.`);
    }
    return "";
  }
  if (typeof value !== "string") {
    throw new Error(`${label} must be text.`);
  }
  const trimmed = value.trim();
  if (required && trimmed.length === 0) {
    throw new Error(`${label} is required.`);
  }
  if (trimmed.length > max) {
    throw new Error(`${label} must be ${max} characters or fewer.`);
  }
  return trimmed;
}

/**
 * Normalize optional comma-separated chip/draft strings for storage/display.
 * Splits on commas, trims, drops empties, de-dupes case-insensitively, rejoins with ", ".
 */
function asNormalizedCommaSeparatedOptional(
  value: unknown,
  label: string,
  max: number,
  maxItems: number,
): string {
  if (value == null || value === "") {
    return "";
  }
  if (typeof value !== "string") {
    throw new Error(`${label} must be text.`);
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
    if (parts.length >= maxItems) {
      break;
    }
  }
  const joined = parts.join(", ");
  if (joined.length > max) {
    throw new Error(`${label} must be ${max} characters or fewer.`);
  }
  return joined;
}

function asBoolean(value: unknown, label: string, fallback: boolean): boolean {
  if (value == null) {
    return fallback;
  }
  if (typeof value !== "boolean") {
    throw new Error(`${label} must be true or false.`);
  }
  return value;
}

function parseEnumSet<T extends string>(
  value: unknown,
  label: string,
  allowed: Set<string>,
  maxItems: number,
): T[] {
  if (value == null) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be a list.`);
  }
  if (value.length > maxItems) {
    throw new Error(`${label} has too many items.`);
  }
  const out: T[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    if (typeof entry !== "string" || !allowed.has(entry)) {
      throw new Error(`Invalid ${label} value.`);
    }
    if (seen.has(entry)) {
      continue;
    }
    seen.add(entry);
    out.push(entry as T);
  }
  return out;
}

function parseOneOf<T extends string>(
  value: unknown,
  label: string,
  allowed: Set<string>,
): T {
  if (typeof value !== "string" || !allowed.has(value)) {
    throw new Error(`Choose a valid ${label}.`);
  }
  return value as T;
}

export function createEmptyAssistedCreationAnswers(): AssistedCreationAnswers {
  return {
    answersVersion: ASSISTED_CREATION_ANSWERS_VERSION,
    rawDescription: "",
    requestType: "not_sure",
    containsText: "not_sure",
    exactText: "",
    textCapitalizationNotes: "",
    textPunctuationNotes: "",
    textLineBreaksExact: false,
    textLayoutFlexible: true,
    primarySubject: "",
    additionalSubjects: "",
    subjectAction: "",
    props: "",
    setting: "",
    occasion: "",
    audience: "",
    personalizationTypes: ["no_personalization"],
    exactRequirements: [],
    flexibilityLevel: "creative_changes_fine",
    stylePreferences: [],
    mood: "",
    includedColors: "",
    excludedColors: "",
    garmentColor: "",
    composition: "no_preference",
    hasReferences: false,
    referenceUsage: [],
  };
}

export function parseAssistedCreationAnswers(raw: unknown): AssistedCreationAnswers {
  const data = asObject(raw, "Answers");
  const answersVersion = data.answersVersion;
  if (answersVersion !== ASSISTED_CREATION_ANSWERS_VERSION && answersVersion !== 1) {
    throw new Error("Unsupported answers version.");
  }

  const rawDescription = asTrimmedString(
    data.rawDescription,
    "Description",
    ASSISTED_CREATION_FIELD_LIMITS.rawDescription,
    true,
  );
  const requestType = parseOneOf<AssistedCreationRequestType>(
    data.requestType,
    "request type",
    REQUEST_TYPES,
  );
  const containsText = parseOneOf<AssistedCreationContainsText>(
    data.containsText,
    "wording option",
    CONTAINS_TEXT,
  );

  const exactText = asTrimmedString(
    data.exactText,
    "Exact wording",
    ASSISTED_CREATION_FIELD_LIMITS.exactText,
    containsText === "exact_wording",
  );
  if (containsText === "exact_wording" && exactText.length === 0) {
    throw new Error("Exact wording is required.");
  }

  let personalizationTypes = parseEnumSet<AssistedCreationPersonalizationType>(
    data.personalizationTypes,
    "personalization types",
    PERSONALIZATION,
    ASSISTED_CREATION_PERSONALIZATION_OPTIONS.length,
  );
  if (personalizationTypes.length === 0) {
    personalizationTypes = ["no_personalization"];
  }
  const hasNoPersonalization = personalizationTypes.includes("no_personalization");
  if (hasNoPersonalization && personalizationTypes.length > 1) {
    throw new Error("Choose either 'No personalization' or specific personalization types.");
  }

  const hasReferences = asBoolean(data.hasReferences, "hasReferences", false);
  const referenceUsage = parseEnumSet<AssistedCreationReferenceUsage>(
    data.referenceUsage,
    "reference usage",
    REFERENCE_USAGE,
    ASSISTED_CREATION_REFERENCE_USAGE_OPTIONS.length,
  );
  if (!hasReferences && referenceUsage.length > 0) {
    throw new Error("Clear reference usage when you have no references.");
  }
  if (hasReferences && referenceUsage.length === 0) {
    throw new Error("Select how references would be used, or choose share later.");
  }

  return {
    answersVersion: ASSISTED_CREATION_ANSWERS_VERSION,
    rawDescription,
    requestType,
    containsText,
    exactText: containsText === "exact_wording" ? exactText : "",
    textCapitalizationNotes: asTrimmedString(
      data.textCapitalizationNotes,
      "Capitalization notes",
      ASSISTED_CREATION_FIELD_LIMITS.shortText,
      false,
    ),
    textPunctuationNotes: asTrimmedString(
      data.textPunctuationNotes,
      "Punctuation notes",
      ASSISTED_CREATION_FIELD_LIMITS.shortText,
      false,
    ),
    textLineBreaksExact: asBoolean(data.textLineBreaksExact, "textLineBreaksExact", false),
    textLayoutFlexible: asBoolean(data.textLayoutFlexible, "textLayoutFlexible", true),
    primarySubject: asTrimmedString(
      data.primarySubject,
      "Primary subject",
      ASSISTED_CREATION_FIELD_LIMITS.subject,
      false,
    ),
    additionalSubjects: asTrimmedString(
      data.additionalSubjects,
      "Additional subjects",
      ASSISTED_CREATION_FIELD_LIMITS.mediumText,
      false,
    ),
    subjectAction: asTrimmedString(
      data.subjectAction,
      "Subject action",
      ASSISTED_CREATION_FIELD_LIMITS.shortText,
      false,
    ),
    props: asTrimmedString(
      data.props,
      "Props",
      ASSISTED_CREATION_FIELD_LIMITS.shortText,
      false,
    ),
    setting: asTrimmedString(
      data.setting,
      "Setting",
      ASSISTED_CREATION_FIELD_LIMITS.mediumText,
      false,
    ),
    occasion: asTrimmedString(
      data.occasion,
      "Occasion",
      ASSISTED_CREATION_FIELD_LIMITS.shortText,
      false,
    ),
    audience: asTrimmedString(
      data.audience,
      "Audience",
      ASSISTED_CREATION_FIELD_LIMITS.shortText,
      false,
    ),
    personalizationTypes,
    exactRequirements: parseEnumSet<AssistedCreationExactRequirement>(
      data.exactRequirements,
      "exact requirements",
      EXACT_REQUIREMENTS,
      ASSISTED_CREATION_EXACT_REQUIREMENT_OPTIONS.length,
    ),
    flexibilityLevel: parseOneOf<AssistedCreationFlexibilityLevel>(
      data.flexibilityLevel,
      "flexibility level",
      FLEXIBILITY,
    ),
    stylePreferences: parseEnumSet<AssistedCreationStylePreference>(
      data.stylePreferences,
      "style preferences",
      STYLES,
      ASSISTED_CREATION_MAX_STYLE_PREFERENCES,
    ),
    mood: asNormalizedCommaSeparatedOptional(
      data.mood,
      "Mood",
      ASSISTED_CREATION_FIELD_LIMITS.shortText,
      ASSISTED_CREATION_MAX_MOOD_ITEMS,
    ),
    includedColors: asTrimmedString(
      data.includedColors,
      "Colors to include",
      ASSISTED_CREATION_FIELD_LIMITS.colorList,
      false,
    ),
    excludedColors: asTrimmedString(
      data.excludedColors,
      "Colors to avoid",
      ASSISTED_CREATION_FIELD_LIMITS.colorList,
      false,
    ),
    garmentColor: asTrimmedString(
      data.garmentColor,
      "Garment color",
      ASSISTED_CREATION_FIELD_LIMITS.shortText,
      false,
    ),
    composition: parseOneOf<AssistedCreationComposition>(
      data.composition,
      "composition",
      COMPOSITIONS,
    ),
    hasReferences,
    referenceUsage: hasReferences ? referenceUsage : [],
  };
}

/** Drop empty optional strings for cleaner Firestore docs. */
export function answersForFirestore(answers: AssistedCreationAnswers): AssistedCreationAnswers {
  return { ...answers };
}

export interface ParsedAssistedCreationReferenceImageInput {
  id: string;
  storagePath: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
}

/**
 * Resolve a customer update reference list: each entry must already exist on the
 * request (id + storagePath) or be a new pending upload under the caller's prefix.
 */
export function parseAssistedCreationReferenceImageUpdateInputs(
  raw: unknown,
  options: {
    customerUid: string;
    requireCloneUpload: boolean;
    existingImages: ParsedAssistedCreationReferenceImageInput[];
  },
): ParsedAssistedCreationReferenceImageInput[] {
  if (raw == null) {
    if (options.requireCloneUpload && options.existingImages.length === 0) {
      throw new Error("Clone-with-subtle-changes requires at least one upload.");
    }
    return options.existingImages.map((image) => ({ ...image }));
  }
  if (!Array.isArray(raw)) {
    throw new Error("Reference images must be a list.");
  }
  if (raw.length > ASSISTED_CREATION_MAX_REFERENCE_IMAGES) {
    throw new Error(`Upload up to ${ASSISTED_CREATION_MAX_REFERENCE_IMAGES} reference images.`);
  }
  if (options.requireCloneUpload && raw.length === 0) {
    throw new Error("Clone-with-subtle-changes requires at least one upload.");
  }

  const pendingPrefix = `assisted-creation/${options.customerUid}/pending/`;
  const existingByKey = new Map<string, ParsedAssistedCreationReferenceImageInput>(
    options.existingImages.map((image) => [`${image.id}::${image.storagePath}`, image]),
  );
  const out: ParsedAssistedCreationReferenceImageInput[] = [];
  const seenIds = new Set<string>();
  const seenPaths = new Set<string>();

  for (const entry of raw) {
    const item = asObject(entry, "Reference image");
    const id = asTrimmedString(item.id, "Reference image id", 80, true);
    if (seenIds.has(id)) {
      throw new Error("Duplicate reference image id.");
    }
    seenIds.add(id);

    const storagePath = asTrimmedString(item.storagePath, "Reference storage path", 500, true);
    if (seenPaths.has(storagePath)) {
      throw new Error("Duplicate reference image path.");
    }
    seenPaths.add(storagePath);

    const existingKey = `${id}::${storagePath}`;
    const existing = existingByKey.get(existingKey);
    if (existing) {
      out.push({ ...existing });
      continue;
    }

    if (!storagePath.startsWith(pendingPrefix)) {
      throw new Error("Invalid reference image path.");
    }

    const fileName = asTrimmedString(item.fileName, "Reference file name", 200, true);
    const contentType = asTrimmedString(item.contentType, "Reference content type", 80, true);
    if (!ALLOWED_REFERENCE_TYPES.has(contentType)) {
      throw new Error("Reference images must be JPEG, PNG, or WebP.");
    }
    if (typeof item.sizeBytes !== "number" || !Number.isFinite(item.sizeBytes)) {
      throw new Error("Reference image size is invalid.");
    }
    const sizeBytes = Math.floor(item.sizeBytes);
    if (sizeBytes <= 0 || sizeBytes > ASSISTED_CREATION_MAX_REFERENCE_BYTES) {
      throw new Error(
        `Each reference image must be ${ASSISTED_CREATION_MAX_REFERENCE_BYTES / (1024 * 1024)} MB or smaller.`,
      );
    }

    out.push({ id, storagePath, fileName, contentType, sizeBytes });
  }

  return out;
}

export function parseAssistedCreationReferenceImageInputs(
  raw: unknown,
  options: { customerUid: string; requireCloneUpload: boolean },
): ParsedAssistedCreationReferenceImageInput[] {
  if (raw == null) {
    if (options.requireCloneUpload) {
      throw new Error("Clone-with-subtle-changes requires at least one upload.");
    }
    return [];
  }
  if (!Array.isArray(raw)) {
    throw new Error("Reference images must be a list.");
  }
  if (raw.length > ASSISTED_CREATION_MAX_REFERENCE_IMAGES) {
    throw new Error(`Upload up to ${ASSISTED_CREATION_MAX_REFERENCE_IMAGES} reference images.`);
  }
  if (options.requireCloneUpload && raw.length === 0) {
    throw new Error("Clone-with-subtle-changes requires at least one upload.");
  }

  const pendingPrefix = `assisted-creation/${options.customerUid}/pending/`;
  const out: ParsedAssistedCreationReferenceImageInput[] = [];
  const seenIds = new Set<string>();
  const seenPaths = new Set<string>();

  for (const entry of raw) {
    const item = asObject(entry, "Reference image");
    const id = asTrimmedString(item.id, "Reference image id", 80, true);
    if (seenIds.has(id)) {
      throw new Error("Duplicate reference image id.");
    }
    seenIds.add(id);

    const storagePath = asTrimmedString(item.storagePath, "Reference storage path", 500, true);
    if (!storagePath.startsWith(pendingPrefix)) {
      throw new Error("Invalid reference image path.");
    }
    if (seenPaths.has(storagePath)) {
      throw new Error("Duplicate reference image path.");
    }
    seenPaths.add(storagePath);

    const fileName = asTrimmedString(item.fileName, "Reference file name", 200, true);
    const contentType = asTrimmedString(item.contentType, "Reference content type", 80, true);
    if (!ALLOWED_REFERENCE_TYPES.has(contentType)) {
      throw new Error("Reference images must be JPEG, PNG, or WebP.");
    }
    if (typeof item.sizeBytes !== "number" || !Number.isFinite(item.sizeBytes)) {
      throw new Error("Reference image size is invalid.");
    }
    const sizeBytes = Math.floor(item.sizeBytes);
    if (sizeBytes <= 0 || sizeBytes > ASSISTED_CREATION_MAX_REFERENCE_BYTES) {
      throw new Error(
        `Each reference image must be ${ASSISTED_CREATION_MAX_REFERENCE_BYTES / (1024 * 1024)} MB or smaller.`,
      );
    }

    out.push({ id, storagePath, fileName, contentType, sizeBytes });
  }

  return out;
}

/**
 * Optional 1–5 rating when approving a proof. Undefined when omitted.
 * Rejects non-integers and out-of-range values.
 */
export function parseAssistedCreationApprovalRating(
  value: unknown,
): AssistedCreationCustomerRating | undefined {
  if (value == null || value === "") {
    return undefined;
  }
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(numeric) || numeric < ASSISTED_CREATION_RATING_MIN || numeric > ASSISTED_CREATION_RATING_MAX) {
    throw new Error(
      `Rating must be a whole number from ${ASSISTED_CREATION_RATING_MIN} to ${ASSISTED_CREATION_RATING_MAX}.`,
    );
  }
  return numeric as AssistedCreationCustomerRating;
}

/** Optional short note with proof approval (not used for revision notes). */
export function parseAssistedCreationApprovalNote(value: unknown): string | undefined {
  if (value == null || value === "") {
    return undefined;
  }
  const trimmed = asTrimmedString(
    value,
    "Approval note",
    ASSISTED_CREATION_FIELD_LIMITS.approvalNote,
    false,
  );
  return trimmed || undefined;
}
