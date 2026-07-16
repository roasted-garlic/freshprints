export const ETSY_RECOMMENDATION_SCHEMA_VERSION = 1 as const;

export const ETSY_RECOMMENDATION_ROUTE = "etsy_recommendations" as const;

export const ETSY_RECOMMENDATION_COLLECTION = "etsyRecommendationRequests";

/** Max length of the canonical Etsy search query string. */
export const ETSY_RECOMMENDATION_MAX_QUERY_LENGTH = 200;

/**
 * Exact saying (optional) — keep searchable; longer quotes dilute Open API matches.
 * Soft cap; query builder still uses only a few distinctive wording tokens.
 */
export const ETSY_RECOMMENDATION_MAX_WORDING_LENGTH = 80;

/** Free-text “what is it of?” (hybrid subject driver). */
export const ETSY_RECOMMENDATION_MAX_SUBJECT_TEXT_LENGTH = 80;

/** Free-text tone / style (optional; suggestions reuse curated labels). */
export const ETSY_RECOMMENDATION_MAX_STYLE_TEXT_LENGTH = 60;

/** Legacy curated subject ids still accepted when rebuilding from old docs. */
export const ETSY_RECOMMENDATION_MAX_SUBJECTS = 2;
/** Max style tokens persisted (legacy multi-pick or one free-text entry). */
export const ETSY_RECOMMENDATION_MAX_STYLES = 2;
/** @deprecated Occasions fold into suggest dictionary / subjectText. */
export const ETSY_RECOMMENDATION_MAX_OCCASIONS = 1;

/**
 * Always appended to canonical / broader website search `q` text.
 * Instant download is a URL filter only (`instant_download=true`) — do not put
 * "digital download" in the query string.
 */
export const ETSY_RECOMMENDATION_DIGITAL_PNG_TERMS = "png" as const;

/**
 * Default Etsy website + Open API browse filters (instant-download PNGs, ≤ $3).
 * Website: `custom_price` (enable flag), `max`.
 * Open API: `min_price`, `max_price`, `currency`.
 */
export const ETSY_RECOMMENDATION_SEARCH_MIN_PRICE_USD = 0;
export const ETSY_RECOMMENDATION_SEARCH_MAX_PRICE_USD = 3;
/** Etsy website `custom_price` flag — `1` enables the min/max price filter UI. */
export const ETSY_RECOMMENDATION_SEARCH_CUSTOM_PRICE_FLAG = 1;
export const ETSY_RECOMMENDATION_SEARCH_CURRENCY = "USD" as const;

/** Versioned localStorage draft key (Portal only). */
export const ETSY_RECOMMENDATION_DRAFT_STORAGE_KEY = "fp.etsyRecommendation.draft.v4";

/** Official Etsy trademark / non-endorsement statement. */
export const ETSY_TRADEMARK_STATEMENT =
  "The term 'Etsy' is a trademark of Etsy, Inc. This application is not endorsed or certified by Etsy, Inc.";

/** @deprecated Use ETSY_TRADEMARK_STATEMENT. */
export const ETSY_API_TRADEMARK_STATEMENT = ETSY_TRADEMARK_STATEMENT;

/** Max listing cards shown from Open API search. */
export const ETSY_RECOMMENDATION_MAX_LISTINGS = 12;

/** Alias used by Open API normalizer (same as MAX_LISTINGS). */
export const ETSY_RECOMMENDATION_DISPLAY_LIMIT = ETSY_RECOMMENDATION_MAX_LISTINGS;

/** Server fetch limit before normalize/filter (Open API max 100). */
export const ETSY_RECOMMENDATION_SEARCH_FETCH_LIMIT = 25;

/** Soft token budget for focused Open API keywords (excludes required digital terms). */
export const ETSY_RECOMMENDATION_MAX_API_KEYWORD_TOKENS = 12;

/** Cap tokens pulled from optional wording/saying into Open API keywords. */
export const ETSY_RECOMMENDATION_MAX_SAYING_API_TOKENS = 4;

/** Server-only rate-limit collection (Admin SDK writes; client deny-all). */
export const ETSY_RECOMMENDATION_RATE_LIMITS_COLLECTION = "etsyRecommendationRateLimits";

/**
 * Daily Open API listing-preview search quotas (UTC day). Applies to in-app preview cards /
 * Refresh results only — not Best match / More options Etsy website links.
 */
/** Max in-app listing preview API calls per portal customer per UTC day. */
export const ETSY_RECOMMENDATION_PREVIEW_SEARCH_DAILY_CUSTOMER_LIMIT = 50;

/**
 * Portal UIDs exempt from the daily listing-preview cap (QA / internal testing).
 * These accounts still call the Open API; usage is not counted toward the customer daily limit.
 */
export const ETSY_RECOMMENDATION_PREVIEW_QUOTA_EXEMPT_UIDS = [
  "XLhapfCG9DZ6k7R17Hy9K5IjpOP2",
] as const;

/** @deprecated Alias — prefer ETSY_RECOMMENDATION_RATE_LIMITS_COLLECTION. */
export const ETSY_RECOMMENDATION_RATE_LIMIT_COLLECTION =
  ETSY_RECOMMENDATION_RATE_LIMITS_COLLECTION;

/** Server-only kill-switch / config collection (unused for Open API this phase). */
export const ETSY_RECOMMENDATION_CONFIG_COLLECTION = "etsyRecommendationConfig";

/** Legacy scrape kill-switch doc id — unused after ADR-FP-087j. */
export const ETSY_WEBSITE_SCRAPE_CONFIG_DOC_ID = "websiteScrape";

/**
 * Admin-added Subject / Tone suggestion overlays (Portal wizard autocomplete).
 * Static seed remains in code; this collection grows via owner/admin callables.
 */
export const ETSY_RECOMMENDATION_SUGGESTIONS_COLLECTION = "etsyRecommendationSuggestions";

export const ETSY_RECOMMENDATION_SUGGESTION_KINDS = ["subject", "style"] as const;
export type EtsyRecommendationSuggestionKind =
  (typeof ETSY_RECOMMENDATION_SUGGESTION_KINDS)[number];

/** Max aliases per admin-added subject suggestion. */
export const ETSY_RECOMMENDATION_SUGGESTION_MAX_ALIASES = 10;

/** Max length per alias string. */
export const ETSY_RECOMMENDATION_SUGGESTION_MAX_ALIAS_LENGTH = 40;

/** Portal client cache TTL for admin suggestion overlays. */
export const ETSY_RECOMMENDATION_SUGGESTIONS_CLIENT_CACHE_TTL_MS = 5 * 60 * 1000;

/** Short-TTL server cache of parsed listing cards (Admin SDK only). */
export const ETSY_WEBSITE_SEARCH_CACHE_COLLECTION = "etsyWebsiteSearchCache";

/** Cache TTL for website scrape listing previews (30 minutes). */
export const ETSY_WEBSITE_SCRAPE_CACHE_TTL_MS = 30 * 60 * 1000;

/** Per-customer daily scrape preview quota (UTC day). */
export const ETSY_WEBSITE_SCRAPE_DAILY_LIMIT = 40;

export interface EtsyRecommendationPickerOption {
  id: string;
  label: string;
  /** Short Etsy-friendly search token(s). */
  apiToken: string;
}

/** Curated subjects — primary search drivers (starter pack; expand later). */
export const ETSY_RECOMMENDATION_SUBJECT_OPTIONS = [
  { id: "highland_cow", label: "Highland cow", apiToken: "highland cow" },
  { id: "cow", label: "Cow", apiToken: "cow" },
  { id: "mama_bear", label: "Mama bear", apiToken: "mama bear" },
  { id: "papa_bear", label: "Papa bear", apiToken: "papa bear" },
  { id: "baby_bear", label: "Baby bear", apiToken: "baby bear" },
  { id: "bear", label: "Bear", apiToken: "bear" },
  { id: "cat", label: "Cat", apiToken: "cat" },
  { id: "dog", label: "Dog", apiToken: "dog" },
  { id: "golden_retriever", label: "Golden retriever", apiToken: "golden retriever" },
  { id: "french_bulldog", label: "French bulldog", apiToken: "french bulldog" },
  { id: "horse", label: "Horse", apiToken: "horse" },
  { id: "chicken", label: "Chicken", apiToken: "chicken" },
  { id: "pig", label: "Pig", apiToken: "pig" },
  { id: "goat", label: "Goat", apiToken: "goat" },
  { id: "llama", label: "Llama", apiToken: "llama" },
  { id: "sloth", label: "Sloth", apiToken: "sloth" },
  { id: "flamingo", label: "Flamingo", apiToken: "flamingo" },
  { id: "dinosaur", label: "Dinosaur", apiToken: "dinosaur" },
  { id: "unicorn", label: "Unicorn", apiToken: "unicorn" },
  { id: "dragon", label: "Dragon", apiToken: "dragon" },
  { id: "skeleton", label: "Skeleton", apiToken: "skeleton" },
  { id: "skull", label: "Skull", apiToken: "skull" },
  { id: "heart", label: "Heart", apiToken: "heart" },
  { id: "skull_crossbones", label: "Skull and crossbones", apiToken: "skull crossbones" },
  { id: "sunflower", label: "Sunflower", apiToken: "sunflower" },
  { id: "rose", label: "Rose", apiToken: "rose" },
  { id: "cactus", label: "Cactus", apiToken: "cactus" },
  { id: "western", label: "Western / cowboy", apiToken: "western cowboy" },
  { id: "truck", label: "Truck", apiToken: "truck" },
  { id: "tractor", label: "Tractor", apiToken: "tractor" },
  { id: "fishing", label: "Fishing", apiToken: "fishing" },
  { id: "hunting", label: "Hunting", apiToken: "hunting" },
  { id: "camping", label: "Camping", apiToken: "camping" },
  { id: "nurse", label: "Nurse", apiToken: "nurse" },
  { id: "teacher", label: "Teacher", apiToken: "teacher" },
  { id: "firefighter", label: "Firefighter", apiToken: "firefighter" },
  { id: "police", label: "Police / law enforcement", apiToken: "police" },
  { id: "military", label: "Military", apiToken: "military" },
  { id: "mom", label: "Mom", apiToken: "mom" },
  { id: "dad", label: "Dad", apiToken: "dad" },
  { id: "grandma", label: "Grandma", apiToken: "grandma" },
  { id: "grandpa", label: "Grandpa", apiToken: "grandpa" },
  { id: "sister", label: "Sister", apiToken: "sister" },
  { id: "brother", label: "Brother", apiToken: "brother" },
  { id: "wife", label: "Wife", apiToken: "wife" },
  { id: "husband", label: "Husband", apiToken: "husband" },
  { id: "family", label: "Family", apiToken: "family" },
  { id: "football", label: "Football", apiToken: "football" },
  { id: "baseball", label: "Baseball", apiToken: "baseball" },
  { id: "basketball", label: "Basketball", apiToken: "basketball" },
  { id: "soccer", label: "Soccer", apiToken: "soccer" },
  { id: "cheer", label: "Cheer", apiToken: "cheer" },
  { id: "gym", label: "Gym / workout", apiToken: "gym workout" },
  { id: "coffee", label: "Coffee", apiToken: "coffee" },
  { id: "wine", label: "Wine", apiToken: "wine" },
  { id: "beer", label: "Beer", apiToken: "beer" },
  { id: "gamer", label: "Gamer", apiToken: "gamer" },
  { id: "music", label: "Music", apiToken: "music" },
  { id: "ghost", label: "Ghost", apiToken: "ghost" },
  { id: "witch", label: "Witch", apiToken: "witch" },
] as const satisfies readonly EtsyRecommendationPickerOption[];

export type EtsyRecommendationSubjectId =
  (typeof ETSY_RECOMMENDATION_SUBJECT_OPTIONS)[number]["id"];

export const ETSY_RECOMMENDATION_OCCASION_OPTIONS = [
  { id: "birthday", label: "Birthday", apiToken: "birthday" },
  { id: "christmas", label: "Christmas", apiToken: "christmas" },
  { id: "halloween", label: "Halloween", apiToken: "halloween" },
  { id: "thanksgiving", label: "Thanksgiving", apiToken: "thanksgiving" },
  { id: "easter", label: "Easter", apiToken: "easter" },
  { id: "valentines", label: "Valentine's Day", apiToken: "valentines" },
  { id: "mothers_day", label: "Mother's Day", apiToken: "mothers day" },
  { id: "fathers_day", label: "Father's Day", apiToken: "fathers day" },
  { id: "graduation", label: "Graduation", apiToken: "graduation" },
  { id: "wedding", label: "Wedding", apiToken: "wedding" },
  { id: "baby_shower", label: "Baby shower", apiToken: "baby shower" },
  { id: "new_year", label: "New Year", apiToken: "new year" },
  { id: "july_4th", label: "4th of July", apiToken: "4th of july" },
  { id: "retirement", label: "Retirement", apiToken: "retirement" },
] as const satisfies readonly EtsyRecommendationPickerOption[];

export type EtsyRecommendationOccasionId =
  (typeof ETSY_RECOMMENDATION_OCCASION_OPTIONS)[number]["id"];

export const ETSY_RECOMMENDATION_STYLE_OPTIONS = [
  "Funny",
  "Cute",
  "Sarcastic",
  "Sassy",
  "Retro",
  "Minimal",
  "Bold",
  "Vintage",
  "Sporty",
  "Elegant",
] as const;

export type EtsyRecommendationStyleOption = (typeof ETSY_RECOMMENDATION_STYLE_OPTIONS)[number];

/** Content steps before review (progress bar segments). */
export const ETSY_RECOMMENDATION_CONTENT_STEP_COUNT = 3;

/** @deprecated Kept for legacy docs only — not used by curated picker search. */
export const ETSY_RECOMMENDATION_DESIGN_FOCUS_OPTIONS = [
  {
    id: "phrase",
    label: "Phrase or saying",
    description: "Mostly text, quotes, slogans, or common sayings.",
    queryTerms: "phrase saying text",
  },
  {
    id: "subject",
    label: "Animal, object, or character",
    description: "A visual subject like an animal, mascot, or illustrated scene.",
    queryTerms: "illustration character",
  },
  {
    id: "occasion",
    label: "Occasion or event",
    description: "Holiday, birthday, team event, or themed celebration.",
    queryTerms: "occasion",
  },
  {
    id: "personalized",
    label: "Personalized design",
    description: "Names, dates, family roles, or custom details for someone specific.",
    queryTerms: "personalized name",
  },
  {
    id: "team",
    label: "Business, team, or school",
    description: "Branding, logos, uniforms, or organization artwork.",
    queryTerms: "team logo",
  },
  {
    id: "unsure",
    label: "Not sure yet",
    description: "We will use your description to guide the search.",
    queryTerms: "",
  },
] as const;

/** @deprecated */
export type EtsyRecommendationDesignFocusId =
  (typeof ETSY_RECOMMENDATION_DESIGN_FOCUS_OPTIONS)[number]["id"];
