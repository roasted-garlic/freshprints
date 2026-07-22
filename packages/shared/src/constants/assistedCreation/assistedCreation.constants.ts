/** Collection + limits for Fresh Prints Assisted Creation (Phase 9C). */

export const ASSISTED_CREATION_COLLECTION = "assistedCreationRequests" as const;

export const ASSISTED_CREATION_SCHEMA_VERSION = 1 as const;

export const ASSISTED_CREATION_ANSWERS_VERSION = 1 as const;

export const ASSISTED_CREATION_DRAFT_STORAGE_KEY = "fp.assistedCreation.draft.v1";

export const ASSISTED_CREATION_MAX_REFERENCE_IMAGES = 8;
export const ASSISTED_CREATION_MAX_REFERENCE_BYTES = 15 * 1024 * 1024;
export const ASSISTED_CREATION_MAX_STYLE_PREFERENCES = 3;
/** Max freeform mood/vibe chips on Style & mood step. */
export const ASSISTED_CREATION_MAX_MOOD_ITEMS = 5;
export const ASSISTED_CREATION_ALLOWED_REFERENCE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const ASSISTED_CREATION_MAX_PROOF_BYTES = 25 * 1024 * 1024;
export const ASSISTED_CREATION_ALLOWED_PROOF_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

/** Days the approved proof full-res remains downloadable before physical Storage delete. */
export const ASSISTED_CREATION_APPROVED_PROOF_RETENTION_DAYS = 14;

export const ASSISTED_CREATION_MESSAGE_MAX_LENGTH = 2000;
export const ASSISTED_CREATION_MESSAGE_COOLDOWN_MS = 10_000;

export const ASSISTED_CREATION_FIELD_LIMITS = {
  rawDescription: 2000,
  exactText: 500,
  subject: 200,
  shortText: 200,
  mediumText: 500,
  longText: 1000,
  revisionNote: 2000,
  approvalNote: 500,
  staffNote: 2000,
  colorList: 300,
} as const;

/** Optional customer star rating when approving a proof (1–5). */
export const ASSISTED_CREATION_RATING_MIN = 1;
export const ASSISTED_CREATION_RATING_MAX = 5;

export type AssistedCreationStatus =
  | "submitted"
  | "in_progress"
  | "proof_ready"
  | "revision_requested"
  | "final_source_needed"
  | "approved"
  | "rejected"
  | "cancelled";

export const ASSISTED_CREATION_OPEN_STATUSES: readonly AssistedCreationStatus[] = [
  "submitted",
  "in_progress",
  "proof_ready",
  "revision_requested",
  "final_source_needed",
] as const;

export const ASSISTED_CREATION_TERMINAL_STATUSES: readonly AssistedCreationStatus[] = [
  "approved",
  "rejected",
  "cancelled",
] as const;

export type AssistedCreationTransitionActor = "customer" | "staff" | "system";

export type AssistedCreationRequestType =
  | "phrase_or_saying"
  | "animal_object_character"
  | "occasion_or_event"
  | "personalized"
  | "business_org_team_school"
  | "memorial_or_tribute"
  | "portrait_person_or_pet"
  | "existing_design_changes"
  | "not_sure";

export type AssistedCreationContainsText =
  | "no_words"
  | "exact_wording"
  | "need_help_with_wording"
  | "not_sure";

export type AssistedCreationFlexibilityLevel =
  | "creative_changes_fine"
  | "close_match_fine"
  | "follow_description_closely"
  | "must_match_exactly";

export type AssistedCreationComposition =
  | "no_preference"
  | "centered_main_subject"
  | "badge_or_emblem"
  | "full_front_coverage"
  | "left_chest"
  | "horizontal_text_emphasis";

export type AssistedCreationWizardStepId =
  | "description"
  | "requestType"
  | "wording"
  | "subject"
  | "occasionAudience"
  | "personalization"
  | "exactnessFlexibility"
  | "styleMood"
  | "colorsGarment"
  | "composition"
  | "references"
  | "review";

export const ASSISTED_CREATION_WIZARD_STEPS: ReadonlyArray<{
  id: AssistedCreationWizardStepId;
  title: string;
  shortLabel: string;
}> = [
  { id: "description", title: "Describe your design", shortLabel: "Describe" },
  { id: "requestType", title: "What kind of request is this?", shortLabel: "Type" },
  { id: "wording", title: "Words on the design", shortLabel: "Wording" },
  { id: "subject", title: "Main visual subject", shortLabel: "Subject" },
  { id: "occasionAudience", title: "Occasion & audience", shortLabel: "Occasion" },
  { id: "personalization", title: "Personalization", shortLabel: "Personalize" },
  { id: "exactnessFlexibility", title: "How flexible should we be?", shortLabel: "Flexibility" },
  { id: "styleMood", title: "Style & mood", shortLabel: "Style" },
  { id: "colorsGarment", title: "Colors & garment", shortLabel: "Colors" },
  { id: "composition", title: "Composition", shortLabel: "Layout" },
  { id: "references", title: "Reference images", shortLabel: "References" },
  { id: "review", title: "Review your answers", shortLabel: "Review" },
] as const;

export const ASSISTED_CREATION_REQUEST_TYPE_OPTIONS: ReadonlyArray<{
  value: AssistedCreationRequestType;
  label: string;
  hint: string;
}> = [
  {
    value: "phrase_or_saying",
    label: "Phrase or saying",
    hint: "Mostly text, quotes, slogans, or common sayings.",
  },
  {
    value: "animal_object_character",
    label: "Animal, object, or character",
    hint: "A visual subject like an animal, mascot, or illustrated scene.",
  },
  {
    value: "occasion_or_event",
    label: "Occasion or event",
    hint: "Holiday, birthday, team event, or themed celebration.",
  },
  {
    value: "personalized",
    label: "Personalized design",
    hint: "Names, dates, family roles, or custom details for someone specific.",
  },
  {
    value: "business_org_team_school",
    label: "Business, team, or school",
    hint: "Branding, logos, uniforms, or organization artwork.",
  },
  {
    value: "memorial_or_tribute",
    label: "Memorial or tribute",
    hint: "Honoring someone with respectful imagery or wording.",
  },
  {
    value: "portrait_person_or_pet",
    label: "Portrait (person or pet)",
    hint: "Likeness-focused artwork of a person or pet.",
  },
  {
    value: "existing_design_changes",
    label: "Changes to an existing design",
    hint: "Modify colors, wording, or layout on artwork you already have.",
  },
  {
    value: "not_sure",
    label: "Not sure yet",
    hint: "We will use your description to guide the next questions.",
  },
] as const;

export const ASSISTED_CREATION_CONTAINS_TEXT_OPTIONS: ReadonlyArray<{
  value: AssistedCreationContainsText;
  label: string;
}> = [
  { value: "no_words", label: "No words — visual only" },
  { value: "exact_wording", label: "Exact wording must appear" },
  { value: "need_help_with_wording", label: "Need help with wording" },
  { value: "not_sure", label: "Not sure yet" },
] as const;

export const ASSISTED_CREATION_FLEXIBILITY_OPTIONS: ReadonlyArray<{
  value: AssistedCreationFlexibilityLevel;
  label: string;
}> = [
  { value: "creative_changes_fine", label: "Creative changes are fine" },
  { value: "close_match_fine", label: "Close match is fine" },
  { value: "follow_description_closely", label: "Follow my description closely" },
  { value: "must_match_exactly", label: "Must match exactly" },
] as const;

export const ASSISTED_CREATION_COMPOSITION_OPTIONS: ReadonlyArray<{
  value: AssistedCreationComposition;
  label: string;
}> = [
  { value: "no_preference", label: "No preference" },
  { value: "centered_main_subject", label: "Centered main subject" },
  { value: "badge_or_emblem", label: "Badge or emblem style" },
  { value: "full_front_coverage", label: "Full front coverage" },
  { value: "left_chest", label: "Left chest size" },
  { value: "horizontal_text_emphasis", label: "Horizontal text emphasis" },
] as const;

export const ASSISTED_CREATION_PERSONALIZATION_OPTIONS = [
  { value: "name", label: "Name" },
  { value: "date_or_year", label: "Date or year" },
  { value: "relationship_or_family_role", label: "Relationship or family role" },
  { value: "jersey_number", label: "Jersey or uniform number" },
  { value: "no_personalization", label: "No personalization" },
] as const;

export type AssistedCreationPersonalizationType =
  (typeof ASSISTED_CREATION_PERSONALIZATION_OPTIONS)[number]["value"];

export const ASSISTED_CREATION_EXACT_REQUIREMENT_OPTIONS = [
  { value: "person_appearance", label: "Exact person appearance" },
  { value: "pet_appearance", label: "Exact pet appearance" },
  { value: "logo", label: "Exact logo" },
  { value: "specific_colors", label: "Specific brand or school colors" },
  { value: "arrangement", label: "Exact layout or arrangement" },
  { value: "existing_design_appearance", label: "Existing design must look the same" },
] as const;

export type AssistedCreationExactRequirement =
  (typeof ASSISTED_CREATION_EXACT_REQUIREMENT_OPTIONS)[number]["value"];

export const ASSISTED_CREATION_STYLE_OPTIONS = [
  { value: "funny", label: "Funny" },
  { value: "cute", label: "Cute" },
  { value: "retro", label: "Retro" },
  { value: "minimal", label: "Minimal" },
  { value: "bold", label: "Bold" },
  { value: "vintage", label: "Vintage" },
  { value: "sporty", label: "Sporty" },
  { value: "elegant", label: "Elegant" },
] as const;

export type AssistedCreationStylePreference =
  (typeof ASSISTED_CREATION_STYLE_OPTIONS)[number]["value"];

export const ASSISTED_CREATION_REFERENCE_USAGE_OPTIONS = [
  { value: "style_inspiration", label: "Style inspiration only" },
  { value: "layout_reference", label: "Layout reference" },
  { value: "color_reference", label: "Color reference" },
  { value: "subject_reference", label: "Subject reference" },
  { value: "clone_with_subtle_changes", label: "Clone these images with subtle changes" },
  { value: "will_share_later", label: "I will share details later with staff" },
] as const;

export type AssistedCreationReferenceUsage =
  (typeof ASSISTED_CREATION_REFERENCE_USAGE_OPTIONS)[number]["value"];

export function isAssistedCreationOpenStatus(status: AssistedCreationStatus): boolean {
  return (ASSISTED_CREATION_OPEN_STATUSES as readonly string[]).includes(status);
}

export function isAssistedCreationTerminalStatus(status: AssistedCreationStatus): boolean {
  return (ASSISTED_CREATION_TERMINAL_STATUSES as readonly string[]).includes(status);
}

/** Past Requests / history lists — terminal statuses only. */
export function filterAssistedCreationTerminalRequests<T extends { status: AssistedCreationStatus }>(
  requests: readonly T[],
): T[] {
  return requests.filter((request) => isAssistedCreationTerminalStatus(request.status));
}

/** Customer may edit brief / references only before staff starts work. */
export function canCustomerUpdateAssistedCreation(status: AssistedCreationStatus): boolean {
  return status === "submitted";
}

/** Customer or staff may send chat messages only while the request is open (not terminal). */
export function canSendAssistedCreationMessage(status: AssistedCreationStatus): boolean {
  return isAssistedCreationOpenStatus(status);
}

export const ASSISTED_CREATION_MESSAGING_CLOSED_MESSAGE =
  "Messaging is closed for completed requests.";

/** Where the status label is shown — `approved` / `rejected` differ by surface. */
export type AssistedCreationStatusLabelVariant = "requestHeader" | "list";

export interface FormatAssistedCreationStatusOptions {
  /**
   * `requestHeader` (default): request modal / status pill → "Completed" for approved,
   * "Not approved" for rejected.
   * `list`: past-requests sidebar / list rows → "Approved" / "Rejected".
   * Proof pills stay hardcoded "Approved" in UI (not this helper).
   */
  variant?: AssistedCreationStatusLabelVariant;
}

export function formatAssistedCreationStatus(
  status: AssistedCreationStatus,
  options?: FormatAssistedCreationStatusOptions,
): string {
  const variant = options?.variant ?? "requestHeader";
  switch (status) {
    case "submitted":
      return "Submitted";
    case "in_progress":
      return "In progress";
    case "proof_ready":
      return "Proof ready";
    case "revision_requested":
      return "Revision requested";
    case "final_source_needed":
      return "Final Source Needed";
    case "approved":
      return variant === "list" ? "Approved" : "Completed";
    case "rejected":
      return variant === "list" ? "Rejected" : "Not approved";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}
