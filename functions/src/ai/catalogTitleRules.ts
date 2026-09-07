import { filterExcludedAiTags, mergeTagExclusions } from "./aiTagExclusions";
import {
  looksLikeOcrDumpTitle,
  sanitizeMeaningfulVisibleTextPhrases,
} from "../../../packages/shared/src/utils/visibleTextQuality";

const VERSION_PATTERN = /[\s-]+(?:v|version)\s*\d+$/i;
const TRAILING_NUMBER_PATTERN = /\s+\d+$/;
const TITLE_TOKEN_EDGE_PUNCTUATION =
  /^['"'""–—|,:;.,!?/\\-]+|['"'""–—|,:;.,!?/\\-]+$/g;
const TRAILING_TITLE_PUNCTUATION = /[\s–—|:;.,!?'"/\\]+$/;
const SEPARATOR_ONLY_TOKEN = /^[–—|-]+$/;

/**
 * Owner contract (ADR-FP-181): structural integrity only — not semantic quality.
 * Reject missing/empty, placeholder tokens, JSON/fence leakage, control corruption,
 * and symbol-dominated garbage. Allow Unicode, punctuation, profanity, slogans.
 */
const STRUCTURAL_PLACEHOLDER_COPY = new Set([
  "-",
  "—",
  "–",
  ".",
  "...",
  "n/a",
  "na",
  "none",
  "null",
  "undefined",
]);

export function isStructurallyValidCatalogCopy(value: unknown): boolean {
  if (typeof value !== "string") {
    return false;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }

  if (STRUCTURAL_PLACEHOLDER_COPY.has(trimmed.toLowerCase())) {
    return false;
  }

  // Markdown / code-fence leakage.
  if (/```/.test(trimmed)) {
    return false;
  }

  // Raw JSON object/array as the field value.
  if (
    /^\s*[{\[][\s\S]*[}\]]\s*$/.test(trimmed) &&
    /[{}:\[\],"]/.test(trimmed)
  ) {
    const letterCount = (trimmed.match(/\p{L}/gu) ?? []).length;
    const structuralChars = (trimmed.match(/[{}\[\]":,]/g) ?? []).length;
    if (structuralChars >= 4 && structuralChars >= letterCount) {
      return false;
    }
  }

  if (/"title"\s*:|"description"\s*:/.test(trimmed) && /[{}]/.test(trimmed)) {
    return false;
  }

  // Control characters (allow tab/newline/carriage return).
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(trimmed)) {
    return false;
  }

  const letters = (trimmed.match(/\p{L}/gu) ?? []).length;
  if (letters < 2) {
    return false;
  }

  // Underscore-run garbage dominating the string.
  const underscores = (trimmed.match(/_/g) ?? []).length;
  if (underscores >= 4 && underscores > letters) {
    return false;
  }

  // Symbol soup: far more exotic symbols than letters (normal punctuation is fine).
  const exotic = (
    trimmed.match(/[^\p{L}\p{N}\s'''ʼ''""\-\u2013\u2014&.,:;!?()\/]/gu) ?? []
  ).length;
  if (exotic > 12 && exotic > letters * 2) {
    return false;
  }

  return true;
}

export function acceptCanonicalCatalogCopy(
  field: "title" | "description",
  value: unknown,
): string {
  if (typeof value !== "string") {
    throw new Error(
      `AI response ${field} is structurally invalid (non-string).`,
    );
  }

  const trimmed = value.trim();
  if (!isStructurallyValidCatalogCopy(trimmed)) {
    throw new Error(`AI response ${field} is structurally invalid.`);
  }

  return trimmed;
}

export function stripTrailingTitlePunctuation(title: string): string {
  return title.replace(TRAILING_TITLE_PUNCTUATION, "").trim();
}

function stripTitleTokenPunctuation(token: string): string {
  return token.replace(TITLE_TOKEN_EDGE_PUNCTUATION, "").trim();
}

function isPunctuationOnlyTitleToken(token: string): boolean {
  const stripped = stripTitleTokenPunctuation(token);

  return !stripped || SEPARATOR_ONLY_TOKEN.test(stripped);
}

function hasTrailingTitlePunctuation(rawTitle: string): boolean {
  return TRAILING_TITLE_PUNCTUATION.test(rawTitle.trim());
}

export const CATALOG_ENRICHMENT_PROMPT_VERSION = "catalog-enrich-v39";
export const DEVELOPMENT_CATALOG_ENRICHMENT_PROMPT_VERSION =
  "catalog-enrich-dev-v39";
const BACKGROUND_PHRASE_PATTERNS = [
  /(?:^|\s+)on a (?:light |dark )?(?:gray|grey|white|black|neutral|charcoal)(?:\s+\w+)?\s+(?:background|backdrop|canvas|matte)\.?/gi,
  /(?:^|\s+)against a (?:light |dark )?(?:gray|grey|white|black|neutral|charcoal)(?:\s+\w+)?\s+(?:background|backdrop|canvas|matte)\.?/gi,
  /(?:^|\s+)with a (?:gray|grey|white|black|neutral|charcoal)(?:\s+\w+)?\s+(?:background|backdrop|canvas|matte)\.?/gi,
  /(?:^|\s+)set against (?:a )?(?:gray|grey|white|black|neutral|charcoal)\s+(?:background|backdrop|canvas)\.?/gi,
  /(?:^|\s+)surrounded by (?:a )?(?:gray|grey|white|black|neutral|charcoal)\s+(?:background|backdrop|canvas)\.?/gi,
];

export const CANVAS_PALETTE_TERMS = new Set([
  "gray",
  "grey",
  "white",
  "black",
  "neutral",
  "charcoal",
  "background",
  "backdrop",
  "canvas",
  "matte",
  "letterbox",
]);

export function sanitizeCatalogDescription(text: string): string {
  let sanitized = text.trim();

  for (const pattern of BACKGROUND_PHRASE_PATTERNS) {
    sanitized = sanitized.replace(pattern, "");
  }

  return sanitized
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.!?])/g, "$1")
    .trim();
}

export type CatalogDescriptionFallbackReason =
  "placeholder" | "empty_after_sanitize" | "missing_field";

export type CatalogDescriptionFallbackTier =
  "visible_text" | "subject_style" | "title" | "generic";

const PLACEHOLDER_DESCRIPTION_VALUES = new Set([
  "-",
  "—",
  "–",
  "n/a",
  "na",
  "none",
  ".",
  "...",
]);

export function isPlaceholderCatalogDescription(
  text: string | undefined,
): boolean {
  if (!text?.trim()) {
    return true;
  }

  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  if (PLACEHOLDER_DESCRIPTION_VALUES.has(lower)) {
    return true;
  }

  if (/^[^\w\s]+$/.test(trimmed)) {
    return true;
  }

  return false;
}

function capitalizeDescriptionSentence(text: string): string {
  const trimmed = text.trim();

  if (!trimmed) {
    return trimmed;
  }

  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function pickDistinctiveDescriptionTags(
  tags: string[] | undefined,
  limit = 2,
): string[] {
  return (tags ?? [])
    .filter((tag) => tag.length > 2 && !isGenericCatalogTitle(tag))
    .slice(0, limit);
}

function synthesizeCatalogDescription(input: {
  title?: string;
  primarySubject?: string;
  style?: string;
  theme?: string;
  tags?: string[];
  visibleText?: string[];
  artworkContainsText?: boolean;
}): { description: string; tier: CatalogDescriptionFallbackTier } {
  const visiblePhrases =
    input.visibleText?.map((phrase) => phrase.trim()).filter(Boolean) ?? [];

  if (visiblePhrases.length > 0) {
    const transcription = visiblePhrases.join(" / ");
    const hasSupportingArt = input.artworkContainsText !== false;

    if (hasSupportingArt) {
      const artSubject = input.primarySubject?.trim();
      const style = input.style?.trim();
      const artParts: string[] = [];

      if (artSubject) {
        artParts.push(artSubject);
      }

      if (style && style !== "unknown") {
        artParts.push(`rendered in a ${style} style`);
      }

      const tagHint = pickDistinctiveDescriptionTags(input.tags, 2);

      if (tagHint.length > 0 && !artSubject) {
        artParts.push(`featuring ${tagHint.join(" and ")} artwork`);
      }

      const sentence2 =
        artParts.length > 0
          ? ` Supporting artwork shows ${artParts.join(" ")}.`
          : " Supporting illustrated artwork completes the design.";

      return {
        description: capitalizeDescriptionSentence(
          `${transcription}.${sentence2}`,
        ),
        tier: "visible_text",
      };
    }

    return {
      description: capitalizeDescriptionSentence(`${transcription}.`),
      tier: "visible_text",
    };
  }

  const subject = input.primarySubject?.trim();
  const style = input.style?.trim();
  const theme = input.theme?.trim();

  if (subject) {
    let core: string;

    if (style && style !== "unknown") {
      core = `A ${style} ${subject} illustration`;
    } else {
      core = `An illustrated ${subject} design`;
    }

    if (theme && theme !== "general") {
      core += ` with a ${theme} theme`;
    }

    const tagHint = pickDistinctiveDescriptionTags(input.tags, 2);

    if (tagHint.length > 0) {
      core += `, featuring ${tagHint.join(" and ")} details`;
    }

    return {
      description: capitalizeDescriptionSentence(`${core}.`),
      tier: "subject_style",
    };
  }

  const title = input.title?.trim();

  if (title && !isGenericCatalogTitle(title)) {
    return {
      description: capitalizeDescriptionSentence(`${title} apparel artwork.`),
      tier: "title",
    };
  }

  return {
    description: "Illustrated apparel artwork ready for catalog review.",
    tier: "generic",
  };
}

export interface ResolveCatalogDescriptionInput {
  candidateDescription?: string;
  title?: string;
  primarySubject?: string;
  style?: string;
  theme?: string;
  tags?: string[];
  visibleText?: string[];
  artworkContainsText?: boolean;
  colorPalette?: string[];
}

export interface ResolveCatalogDescriptionResult {
  description: string;
  usedFallback: boolean;
  fallbackReason?: CatalogDescriptionFallbackReason;
  fallbackTier?: CatalogDescriptionFallbackTier;
}

export function resolveCatalogDescription(
  input: ResolveCatalogDescriptionInput,
): ResolveCatalogDescriptionResult {
  const sanitized = sanitizeCatalogDescription(
    input.candidateDescription ?? "",
  );
  let fallbackReason: CatalogDescriptionFallbackReason | undefined;

  if (!input.candidateDescription?.trim()) {
    fallbackReason = "missing_field";
  } else if (isPlaceholderCatalogDescription(input.candidateDescription)) {
    fallbackReason = "placeholder";
  } else if (isPlaceholderCatalogDescription(sanitized)) {
    fallbackReason = "empty_after_sanitize";
  }

  if (!fallbackReason) {
    return {
      description: sanitized.slice(0, 500),
      usedFallback: false,
    };
  }

  const synthesized = synthesizeCatalogDescription(input);
  const final = sanitizeCatalogDescription(synthesized.description).slice(
    0,
    500,
  );

  if (isPlaceholderCatalogDescription(final)) {
    return {
      description: "Illustrated apparel artwork ready for catalog review.",
      usedFallback: true,
      fallbackReason,
      fallbackTier: "generic",
    };
  }

  return {
    description: final,
    usedFallback: true,
    fallbackReason,
    fallbackTier: synthesized.tier,
  };
}

/** Returns true when multi-segment visibleText exists but description sentence 1 omits the primary phrase. */
export function descriptionLacksVisibleTextOverlap(
  description: string | undefined,
  visibleText: string[] | undefined,
): boolean {
  if (!visibleText || visibleText.length < 2 || !description?.trim()) {
    return false;
  }

  const firstSentence = description.split(/[.!?]/)[0]?.trim() ?? "";
  const primaryPhrase = visibleText[0]?.trim() ?? "";

  if (!firstSentence || !primaryPhrase) {
    return false;
  }

  const sentenceComparable = normalizeComparableTitle(firstSentence);
  const phraseWords = normalizeComparableTitle(primaryPhrase)
    .split(" ")
    .filter((word) => word.length > 2);

  if (phraseWords.length === 0) {
    return false;
  }

  const sentenceWords = new Set(sentenceComparable.split(" ").filter(Boolean));
  const overlap = phraseWords.filter((word) => sentenceWords.has(word)).length;

  return overlap / phraseWords.length < 0.5;
}

export function filterBackgroundColorsFromPalette(
  colorPalette: string[] | undefined,
): string[] | undefined {
  if (!colorPalette?.length) {
    return undefined;
  }

  const filtered = colorPalette
    .map((color) => color.trim())
    .filter((color) => {
      if (!color) {
        return false;
      }

      const lower = color.toLowerCase();

      if (CANVAS_PALETTE_TERMS.has(lower)) {
        return false;
      }

      if (
        /\b(background|backdrop|canvas|matte|surrounding|neutral)\b/i.test(
          lower,
        )
      ) {
        return false;
      }

      if (
        /^(?:light |dark )?(?:gray|grey|white|black|charcoal)\b/i.test(lower)
      ) {
        return false;
      }

      return true;
    });

  return filtered.length > 0 ? filtered : undefined;
}

/** Default word cap for OCR-era title normalization. Lean titles pass a higher cap. */
const DEFAULT_CATALOG_TITLE_MAX_WORDS = 6;
const LEAN_CATALOG_TITLE_MAX_WORDS = 24;

export function normalizeCatalogTitle(
  rawTitle: string,
  maxWords: number = DEFAULT_CATALOG_TITLE_MAX_WORDS,
): string {
  const cleaned = rawTitle
    .replace(/\.[a-z0-9]{2,5}$/i, "")
    .replace(VERSION_PATTERN, "")
    .replace(TRAILING_NUMBER_PATTERN, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) {
    return "";
  }

  const words = cleaned
    .split(" ")
    .map(stripTitleTokenPunctuation)
    .filter((word) => word && !isPunctuationOnlyTitleToken(word))
    .slice(0, Math.max(1, maxWords));

  if (words.length === 0) {
    return "";
  }

  return stripTrailingTitlePunctuation(words.map(capitalizeWord).join(" "));
}

function capitalizeWord(word: string): string {
  if (!word) {
    return word;
  }

  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

export function normalizeComparableTitle(value: string): string {
  return value
    .toLowerCase()
    .replace(/\.[a-z0-9]{2,5}$/i, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const GENERIC_CATALOG_TITLE_TOKENS = new Set([
  "text",
  "typography",
  "typographic",
  "quote",
  "words",
  "word",
  "label",
  "saying",
  "slogan",
  "lettering",
  "font",
  "type",
  "caption",
  "title",
  "design",
  "graphic",
  "artwork",
  "image",
  "print",
  "shirt",
  "tee",
  "dtf",
  "transfer",
  "png",
  "words art",
  "word art",
  "lettering art",
  "typography art",
  "text art",
  "text design",
  "typography design",
]);

export const GENERIC_CATALOG_TAGS = new Set([
  "shirt",
  "tshirt",
  "tee",
  "design",
  "print",
  "png",
  "dtf",
  "transfer",
  "image",
  "artwork",
  "graphic",
  "background",
  "canvas",
  "quote",
  "saying",
  "slogan",
  "typography",
  "lettering",
  "text",
  "words",
  "word",
  "label",
  "font",
  "type",
  "caption",
]);

export function isGenericCatalogTitle(title: string): boolean {
  const comparable = normalizeComparableTitle(title);

  if (!comparable) {
    return true;
  }

  if (GENERIC_CATALOG_TITLE_TOKENS.has(comparable)) {
    return true;
  }

  const words = comparable.split(" ").filter(Boolean);

  if (
    words.length <= 2 &&
    words.every((word) => GENERIC_CATALOG_TITLE_TOKENS.has(word))
  ) {
    return true;
  }

  return false;
}

/** Case-insensitive description-prose openings that must never become catalog titles. */
const DESCRIPTION_LIKE_TITLE_OPENINGS = [
  "the design features",
  "the design shows",
  "the design depicts",
  "the image features",
  "the image shows",
  "the image depicts",
  "the artwork features",
  "the artwork shows",
  "the artwork depicts",
  "the graphic features",
  "the graphic shows",
  "the graphic depicts",
  "this design features",
  "this design depicts",
  "this design shows",
  "this image contains",
  "this image shows",
  "this graphic contains",
  "an illustration of",
  "an image of",
  "a design with",
  "a design of",
  "a graphic of",
  "an artwork of",
] as const;

const VISUAL_SCENE_DESCRIPTION_PATTERN =
  /\b(?:wearing|featuring|standing|holding|sitting|outline of|silhouette of|surrounded by|set against|polka\s*dot|lettering|typography)\b/i;

const DECORATIVE_SUBJECT_TOKENS = new Set([
  "polka",
  "dot",
  "dots",
  "bow",
  "bows",
  "starburst",
  "starbursts",
  "sparkle",
  "sparkles",
  "outline",
  "outlines",
  "shadow",
  "shadows",
  "snowflake",
  "snowflakes",
  "decorative",
  "decoration",
  "decorations",
  "accent",
  "accents",
  "flourish",
  "flourishes",
  "red",
  "white",
  "black",
  "pink",
  "blue",
  "green",
  "gold",
  "silver",
]);

/**
 * True when a title (or extracted phrase) reads like description prose rather than a
 * searchable catalog title. Matches known boilerplate openings and common prose shapes.
 */
export function isDescriptionLikeCatalogTitle(title: string): boolean {
  const trimmed = title
    .trim()
    .replace(/^[\s"'“”‘’]+/u, "")
    .trim();

  if (!trimmed) {
    return false;
  }

  const lower = trimmed.toLowerCase().replace(/\s+/g, " ");

  if (
    DESCRIPTION_LIKE_TITLE_OPENINGS.some((opening) => lower.startsWith(opening))
  ) {
    return true;
  }

  if (
    /^(?:the|this|an|a)\s+(?:design|image|artwork|graphic|illustration)\b/i.test(
      trimmed,
    )
  ) {
    return true;
  }

  // Prose sentences that describe composition rather than naming the design.
  if (
    /\b(?:features|shows|depicts|contains)\s+(?:the|a|an)\b/i.test(lower) &&
    VISUAL_SCENE_DESCRIPTION_PATTERN.test(lower)
  ) {
    return true;
  }

  return false;
}

/**
 * True when a leading description sentence looks like a no-text visual scene, not readable slogan copy.
 */
function isVisualSceneDescriptionSentence(sentence: string): boolean {
  const trimmed = sentence.trim();

  if (!trimmed || isDescriptionLikeCatalogTitle(trimmed)) {
    return true;
  }

  return VISUAL_SCENE_DESCRIPTION_PATTERN.test(trimmed);
}

/**
 * Guarded leading-sentence recovery for unquoted slogan transcriptions only.
 * Never returns description boilerplate or visual-scene prose.
 */
function extractSloganLikeLeadingTranscription(description: string): string {
  const firstSentence = description.split(/[.!?]/)[0]?.trim() ?? "";

  if (!firstSentence || isDescriptionLikeCatalogTitle(firstSentence)) {
    return "";
  }

  if (isVisualSceneDescriptionSentence(firstSentence)) {
    return "";
  }

  // Prefer explicit narration elsewhere when the lead is not itself a clear slogan line.
  if (
    /\b(?:text\s+)?(?:reads|says|reading)\b/i.test(description) &&
    !/\b(?:text\s+)?(?:reads|says|reading)\b/i.test(firstSentence)
  ) {
    return "";
  }

  return normalizeCatalogTitle(firstSentence, LEAN_CATALOG_TITLE_MAX_WORDS);
}

/**
 * Strip decorative detail tokens from a subject phrase (bow, polka, sparkles, colors, etc.).
 */
export function sanitizeCentralSubjectPhrase(
  subject: string | undefined,
): string {
  if (!subject?.trim()) {
    return "";
  }

  if (
    isDescriptionLikeCatalogTitle(subject) ||
    isGenericCatalogTitle(subject)
  ) {
    return "";
  }

  const words = normalizeCatalogTitle(subject, LEAN_CATALOG_TITLE_MAX_WORDS)
    .split(/\s+/)
    .filter(Boolean)
    .filter((word) => {
      const comparable = normalizeComparableTitle(word);
      return (
        Boolean(comparable) &&
        !DECORATIVE_SUBJECT_TOKENS.has(comparable) &&
        !TITLE_CONTENT_STOPWORDS.has(comparable)
      );
    });

  if (words.length === 0) {
    return "";
  }

  const cleaned = words.join(" ");

  if (isStyleWordHeavyTitle(cleaned) || isGenericCatalogTitle(cleaned)) {
    return "";
  }

  return stripTrailingTitlePunctuation(cleaned);
}

function titleSharesMeaningfulReadableTokens(
  title: string,
  readableLines: readonly string[] | undefined,
): boolean {
  if (!readableLines?.length) {
    return false;
  }
  const titleTokens = new Set(
    normalizeComparableTitle(title)
      .split(" ")
      .filter((token) => token.length > 2),
  );
  if (titleTokens.size === 0) {
    return false;
  }
  let overlap = 0;
  for (const line of readableLines) {
    for (const token of normalizeComparableTitle(line)
      .split(" ")
      .filter((item) => item.length > 2)) {
      if (titleTokens.has(token)) {
        overlap += 1;
      }
    }
  }
  return overlap >= 2;
}

/**
 * Join readable text lines into a title foundation without paraphrasing.
 */
export function buildTitleFromReadableTextLines(
  lines: readonly string[] | undefined,
  centralSubject?: string,
  maxWords: number = LEAN_CATALOG_TITLE_MAX_WORDS,
): string {
  if (!lines?.length) {
    return "";
  }

  const segments: string[] = [];
  appendUniqueSloganPhrases(
    segments,
    lines.map((line) => line.trim()).filter(Boolean),
  );

  if (segments.length === 0) {
    return "";
  }

  const foundation = normalizeCatalogTitle(segments.join(" "), maxWords);

  if (
    !foundation ||
    isDescriptionLikeCatalogTitle(foundation) ||
    isGenericCatalogTitle(foundation)
  ) {
    return "";
  }

  const subject = sanitizeCentralSubjectPhrase(centralSubject);

  if (!subject) {
    return stripTrailingTitlePunctuation(foundation);
  }

  const foundationComparable = normalizeComparableTitle(foundation);
  const subjectComparable = normalizeComparableTitle(subject);

  if (
    !subjectComparable ||
    foundationComparable.includes(subjectComparable) ||
    subjectComparable.includes(foundationComparable)
  ) {
    return stripTrailingTitlePunctuation(foundation);
  }

  return stripTrailingTitlePunctuation(
    normalizeCatalogTitle(`${foundation} ${subject}`, maxWords),
  );
}

function isSloganLikeQuotedPhrase(phrase: string): boolean {
  const comparable = normalizeComparableTitle(phrase);
  const words = comparable.split(" ").filter(Boolean);

  if (words.length === 0) {
    return false;
  }

  // Drop meta/style fragments often quoted in prose ("bold", "distressed", "text").
  if (words.length === 1) {
    const word = words[0] ?? "";
    if (
      BANNED_TITLE_STYLE_WORDS.has(word) ||
      GENERIC_CATALOG_TITLE_TOKENS.has(word)
    ) {
      return false;
    }
  }

  return true;
}

function phraseAlreadyCovered(
  existing: readonly string[],
  candidate: string,
): boolean {
  const candidateComparable = normalizeComparableTitle(candidate);

  if (!candidateComparable) {
    return true;
  }

  return existing.some((phrase) => {
    const existingComparable = normalizeComparableTitle(phrase);
    return (
      existingComparable === candidateComparable ||
      existingComparable.includes(candidateComparable) ||
      candidateComparable.includes(existingComparable)
    );
  });
}

function appendUniqueSloganPhrases(
  target: string[],
  candidates: readonly string[],
): void {
  for (const candidate of candidates) {
    const trimmed = candidate.trim();
    if (
      !trimmed ||
      !isSloganLikeQuotedPhrase(trimmed) ||
      phraseAlreadyCovered(target, trimmed)
    ) {
      continue;
    }
    target.push(trimmed);
  }
}

/**
 * Collect double-quoted readable slogan segments in description order.
 * Straight quotes first; curly double quotes only when no straight quotes exist.
 * Never treats contraction apostrophes as delimiters.
 */
export function extractQuotedReadablePhrases(description: string): string[] {
  const straight: string[] = [];
  const straightPattern = /"([^"]+)"/g;
  let match: RegExpExecArray | null;

  while ((match = straightPattern.exec(description)) !== null) {
    const phrase = match[1]?.trim() ?? "";
    if (phrase && isSloganLikeQuotedPhrase(phrase)) {
      straight.push(phrase);
    }
  }

  if (straight.length > 0) {
    return straight;
  }

  const curly: string[] = [];
  const curlyPattern = /\u201C([^\u201C\u201D]+)\u201D/g;

  while ((match = curlyPattern.exec(description)) !== null) {
    const phrase = match[1]?.trim() ?? "";
    if (phrase && isSloganLikeQuotedPhrase(phrase)) {
      curly.push(phrase);
    }
  }

  return curly;
}

/**
 * Readable wording introduced by narration such as `Text reads '…'` / `says "…"`.
 * Allows single quotes only when tied to reads/says so contractions are never quote delimiters.
 */
export function extractNarratedReadablePhrases(description: string): string[] {
  const phrases: string[] = [];
  const patterns: RegExp[] = [
    /\b(?:text\s+)?(?:reads|says|reading)\s*[:\s]*"([^"]{1,160})"/gi,
    /\b(?:text\s+)?(?:reads|says|reading)\s*[:\s]*\u201C([^\u201C\u201D]{1,160})\u201D/gi,
    /\b(?:text\s+)?(?:reads|says|reading)\s*[:\s]*'([^']{1,160})'/gi,
    /\b(?:text\s+)?(?:reads|says|reading)\s*[:\s]*\u2018([^\u2018\u2019]{1,160})\u2019/gi,
  ];

  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(description)) !== null) {
      const phrase = (match[1] ?? "").replace(/\s+/g, " ").trim();
      if (
        phrase &&
        isSloganLikeQuotedPhrase(phrase) &&
        !isDescriptionLikeCatalogTitle(phrase)
      ) {
        appendUniqueSloganPhrases(phrases, [phrase]);
      }
    }
  }

  return phrases;
}

/**
 * Continuation lines narrated in prose without a second quote, e.g.
 * `"Sarcasm". Below it, in smaller lettering, it says Just one of my many talents.`
 */
export function extractProseContinuationPhrases(description: string): string[] {
  const patterns: RegExp[] = [
    /\b(?:below|under|underneath|beneath)\s+(?:it|that|this|the\s+word|the\s+text)?[^.]{0,120}?\b(?:says|reads|reading)\s*[:\s]*["\u201C]?([^"\u201D\n.!?]{3,120})/gi,
    /\bsmaller\s+(?:text|lettering|type|font|words?)[^.]{0,100}?\b(?:says|reads|reading)\s*[:\s]*["\u201C]?([^"\u201D\n.!?]{3,120})/gi,
    /\b(?:second|lower|bottom|continuation)\s+line\s+(?:that\s+)?(?:says|reads|reading)\s*[:\s]*["\u201C]?([^"\u201D\n.!?]{3,120})/gi,
    /\bappears\s+above\s+(?:a\s+)?(?:second\s+)?line\s+(?:that\s+)?(?:reads|says)\s*[:\s]*["\u201C]?([^"\u201D\n.!?]{3,120})/gi,
    /\b(?:followed\s+by|then|and\s+then)\s+(?:the\s+)?(?:line|text|phrase|words?)\s*[:\s]*["\u201C]?([^"\u201D\n.!?]{3,120})/gi,
  ];

  const styleCutWords = new Set([
    "in",
    "with",
    "featuring",
    "using",
    "on",
    "decorative",
    "bold",
    "stacked",
    "distressed",
    "typography",
    "lettering",
    "font",
    "style",
    "sparkles",
    "sparkle",
    "stars",
    "star",
  ]);

  const phrases: string[] = [];

  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(description)) !== null) {
      const words = (match[1] ?? "")
        .replace(/\s+/g, " ")
        .trim()
        .split(/\s+/)
        .filter(Boolean);
      const kept: string[] = [];
      for (const word of words) {
        if (styleCutWords.has(word.toLowerCase()) && kept.length >= 2) {
          break;
        }
        kept.push(word);
      }
      const raw = kept.join(" ").trim();
      if (raw) {
        appendUniqueSloganPhrases(phrases, [raw]);
      }
    }
  }

  return phrases;
}

/**
 * Slash- or pipe-joined transcriptions in the leading description text
 * (`Sarcasm / Just one of my many talents`).
 */
export function extractSlashJoinedReadableSegments(
  description: string,
): string[] {
  const lead = description.split(/[.!?]/)[0] ?? description;
  if (!/\s[|/]\s/.test(lead)) {
    return [];
  }

  const styleCutWords = new Set([
    "in",
    "with",
    "featuring",
    "using",
    "on",
    "decorative",
    "bold",
    "stacked",
    "distressed",
    "typography",
    "lettering",
    "font",
    "style",
  ]);

  return lead
    .split(/\s[|/]\s/)
    .map((segment) => {
      const words = segment.trim().split(/\s+/).filter(Boolean);
      const kept: string[] = [];
      for (const word of words) {
        if (styleCutWords.has(word.toLowerCase()) && kept.length >= 2) {
          break;
        }
        kept.push(word);
      }
      return kept.join(" ").trim();
    })
    .filter((segment) => isSloganLikeQuotedPhrase(segment));
}

/**
 * Build the best readable wording phrase from a catalog description.
 * Merges quoted segments, narrated reads/says phrases, prose continuations, and slash-joined
 * lines so intermittent Gemini narration styles still yield the full text-dominant slogan.
 * Never uses a description-boilerplate or visual-scene first sentence as the title wording.
 */
export function extractPrimaryWordingFromDescription(
  description: string | undefined,
  maxWords: number = DEFAULT_CATALOG_TITLE_MAX_WORDS,
): string {
  if (!description?.trim()) {
    return "";
  }

  const quoted = extractQuotedReadablePhrases(description);
  const narrated = extractNarratedReadablePhrases(description);
  const continuations = extractProseContinuationPhrases(description);
  const slashSegments = extractSlashJoinedReadableSegments(description);

  const segments: string[] = [];
  appendUniqueSloganPhrases(segments, quoted);
  appendUniqueSloganPhrases(segments, narrated);
  appendUniqueSloganPhrases(segments, continuations);
  appendUniqueSloganPhrases(segments, slashSegments);

  // Continuation-only narration ("appears above a second line that reads …") often omits the
  // headline from the capture group — prepend a leading quoted/single-token headline when present.
  if (
    continuations.length > 0 &&
    quoted.length === 0 &&
    narrated.length === 0 &&
    slashSegments.length === 0
  ) {
    const leadMatch = description.match(
      /^[\s\S]{0,80}?\b([A-Za-z][A-Za-z0-9'\u2019]{1,24})\b(?=\s+(?:appears|sits|reads|says|above|over|in\b))/i,
    );
    const lead = leadMatch?.[1]?.trim() ?? "";
    if (
      lead &&
      isSloganLikeQuotedPhrase(lead) &&
      !phraseAlreadyCovered(segments, lead)
    ) {
      segments.unshift(lead);
    }
  }

  if (segments.length > 0) {
    const joined = normalizeCatalogTitle(segments.join(" "), maxWords);
    return isDescriptionLikeCatalogTitle(joined) ? "" : joined;
  }

  const sloganLead = extractSloganLikeLeadingTranscription(description);
  return isDescriptionLikeCatalogTitle(sloganLead) ? "" : sloganLead;
}

const EXTRA_NON_SLOGAN_TRAILING_WORDS = [
  "black",
  "white",
  "gold",
  "silver",
  "red",
  "blue",
  "green",
  "pink",
  "purple",
  "yellow",
  "orange",
  "brown",
  "gray",
  "grey",
  "apparel",
  "shirt",
  "tee",
  "clothing",
  "garment",
  "print",
  "ink",
  "color",
  "colour",
  "colors",
  "colours",
] as const;

function isNonSloganTrailingWord(word: string): boolean {
  const lower = word.toLowerCase();
  return (
    BANNED_TITLE_STYLE_WORDS.has(lower) ||
    EXTRA_NON_SLOGAN_TRAILING_WORDS.includes(
      lower as (typeof EXTRA_NON_SLOGAN_TRAILING_WORDS)[number],
    )
  );
}

/**
 * When the title is a short headline token, find extra slogan wording later in the
 * description that is not merely style/canvas narration (covers unquoted continuations).
 */
function extractTrailingSloganAfterTitle(
  description: string,
  title: string,
): string {
  const titleComparable = normalizeComparableTitle(title);
  const titleWords = titleComparable.split(" ").filter(Boolean);

  if (titleWords.length === 0 || titleWords.length > 3) {
    return "";
  }

  const escaped = titleWords
    .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("\\s+");
  const afterTitle = new RegExp(`${escaped}\\b([\\s\\S]{0,200})`, "i");
  const match = description.match(afterTitle);

  if (!match?.[1]) {
    return "";
  }

  const remainder = match[1]
    .replace(/["\u201C\u201D]/g, " ")
    .replace(
      /\b(?:below|under|underneath|beneath|smaller|larger|bold|distressed|lettering|typography|decorative|stars?|sparkles?|lines?|borders?|appears|above|reads?|says?|reading|text|in|the|a|an|with|and|it|that|this|line|second|on|apparel)\b/gi,
      " ",
    )
    .replace(/[^a-zA-Z0-9'\u2019]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!remainder) {
    return "";
  }

  const remainderWords = remainder
    .split(" ")
    .filter(Boolean)
    .filter((word) => !isNonSloganTrailingWord(word));

  // Need a real continuation phrase, not leftover color/product adjectives.
  if (remainderWords.length < 3) {
    return "";
  }

  const sloganTail = remainderWords.slice(0, 16).join(" ");
  if (!isSloganLikeQuotedPhrase(sloganTail)) {
    return "";
  }

  return normalizeCatalogTitle(
    `${title} ${sloganTail}`,
    LEAN_CATALOG_TITLE_MAX_WORDS,
  );
}

/**
 * Best-effort full readable wording for comparing/replacing an incomplete model title.
 * Prefer structured quotes/continuations/slashes; if those still equal the short title,
 * recover unquoted trailing slogan words after the title token.
 */
export function resolveReadableWordingForTitle(
  description: string | undefined,
  candidateTitle: string | undefined,
  maxWords: number = LEAN_CATALOG_TITLE_MAX_WORDS,
): string {
  const primary = extractPrimaryWordingFromDescription(description, maxWords);

  if (!description?.trim() || !candidateTitle?.trim()) {
    return primary;
  }

  const titleComparable = normalizeComparableTitle(candidateTitle);
  const primaryComparable = normalizeComparableTitle(primary);

  if (
    primaryComparable &&
    titleComparable &&
    primaryComparable !== titleComparable
  ) {
    return primary;
  }

  const recovered = extractTrailingSloganAfterTitle(
    description,
    candidateTitle,
  );
  return recovered || primary;
}

/**
 * True when the model title looks like a truncated fragment of the description's readable phrase
 * (dominant first line / apostrophe clip / first of several lines), not a genuinely
 * complete short title.
 */
export function isIncompleteTitleVsDescription(
  title: string,
  description: string | undefined,
): boolean {
  if (!title.trim() || !description?.trim()) {
    return false;
  }

  const wording = resolveReadableWordingForTitle(
    description,
    title,
    LEAN_CATALOG_TITLE_MAX_WORDS,
  );
  const titleComparable = normalizeComparableTitle(title);
  const wordingComparable = normalizeComparableTitle(wording);

  if (
    !titleComparable ||
    !wordingComparable ||
    titleComparable === wordingComparable
  ) {
    return false;
  }

  const titleWords = titleComparable.split(" ").filter(Boolean);
  const wordingWords = wordingComparable.split(" ").filter(Boolean);

  if (wordingWords.length < 3) {
    return false;
  }

  // One short token (or OCR clip of "I'm" → "I") while description has a multiword phrase.
  if (
    titleWords.length === 1 &&
    wordingComparable.startsWith(`${titleComparable} `)
  ) {
    return true;
  }

  // Title is a proper prefix of the readable phrase with meaningful remaining wording.
  if (
    wordingComparable.startsWith(`${titleComparable} `) &&
    wordingWords.length >= titleWords.length + 2
  ) {
    return true;
  }

  // Title matches only the first quoted/slash segment while additional slogan segments exist.
  const segments: string[] = [];
  appendUniqueSloganPhrases(
    segments,
    extractQuotedReadablePhrases(description),
  );
  appendUniqueSloganPhrases(
    segments,
    extractNarratedReadablePhrases(description),
  );
  appendUniqueSloganPhrases(
    segments,
    extractProseContinuationPhrases(description),
  );
  appendUniqueSloganPhrases(
    segments,
    extractSlashJoinedReadableSegments(description),
  );

  if (segments.length >= 2) {
    const firstComparable = normalizeComparableTitle(segments[0] ?? "");
    if (firstComparable && titleComparable === firstComparable) {
      return true;
    }
  }

  return false;
}

/**
 * Style / mood / meta words that must not form a catalog title unless they appear in the
 * design's visible wording. Used to reject tag-invented titles like
 * "Sarcastic Funny Attitude Statement Retro Distressed".
 */
export const BANNED_TITLE_STYLE_WORDS = new Set([
  "funny",
  "sarcastic",
  "attitude",
  "quote",
  "retro",
  "distressed",
  "typography",
  "text",
  "statement",
  "design",
  "humor",
  "humorous",
  "mood",
  "edgy",
  "vintage",
  "bold",
  "graphic",
  "artwork",
  "slogan",
  "saying",
  "lettering",
  "font",
  "type",
  "caption",
  "words",
  "word",
  "aesthetic",
  "vibe",
  "vibes",
]);

const TITLE_CONTENT_STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "or",
  "the",
  "of",
  "to",
  "for",
  "with",
  "in",
  "on",
  "at",
]);

/**
 * True when most content words in the title are banned style/mood/meta terms (tag-like invention).
 */
export function isStyleWordHeavyTitle(title: string): boolean {
  const words = normalizeComparableTitle(title)
    .split(" ")
    .filter(Boolean)
    .filter((word) => !TITLE_CONTENT_STOPWORDS.has(word));

  if (words.length === 0) {
    return false;
  }

  const styleWordCount = words.filter((word) =>
    BANNED_TITLE_STYLE_WORDS.has(word),
  ).length;

  if (styleWordCount >= 3) {
    return true;
  }

  return words.length >= 2 && styleWordCount / words.length >= 0.5;
}

/**
 * True when the candidate title shares little wording with the description's readable text
 * (quoted phrase or first sentence), suggesting the title was invented from tags/style instead.
 */
export function titleLacksDescriptionReadableOverlap(
  title: string,
  description: string | undefined,
): boolean {
  if (!description?.trim() || !title.trim()) {
    return false;
  }

  const wording = extractPrimaryWordingFromDescription(
    description,
    LEAN_CATALOG_TITLE_MAX_WORDS,
  );
  const wordingComparable = normalizeComparableTitle(wording);

  if (!wordingComparable) {
    return false;
  }

  const wordingWords = wordingComparable
    .split(" ")
    .filter((word) => word.length > 2 && !TITLE_CONTENT_STOPWORDS.has(word));

  if (wordingWords.length < 3) {
    return false;
  }

  const titleWords = new Set(
    normalizeComparableTitle(title)
      .split(" ")
      .filter((word) => word.length > 2 && !TITLE_CONTENT_STOPWORDS.has(word)),
  );

  if (titleWords.size === 0) {
    return true;
  }

  const overlap = wordingWords.filter((word) => titleWords.has(word)).length;

  return overlap / wordingWords.length < 0.35;
}

export function isFilenameLikeTitle(
  suggestedTitle: string,
  uploadFileStem: string,
): boolean {
  const suggested = normalizeComparableTitle(suggestedTitle);
  const upload = normalizeComparableTitle(uploadFileStem);

  if (!suggested || !upload) {
    return false;
  }

  if (suggested === upload) {
    return true;
  }

  if (suggested.includes(upload) || upload.includes(suggested)) {
    return true;
  }

  const suggestedTokens = new Set(suggested.split(" ").filter(Boolean));
  const uploadTokens = upload.split(" ").filter(Boolean);

  if (uploadTokens.length === 0) {
    return false;
  }

  const overlap = uploadTokens.filter((token) =>
    suggestedTokens.has(token),
  ).length;
  const overlapRatio = overlap / uploadTokens.length;

  return overlapRatio >= 0.75 && uploadTokens.length >= 2;
}

/**
 * @deprecated Do not use for catalog titles. Kept only for legacy test references; resolvers
 * must never synthesize titles by joining tags.
 */
export function buildTitleFromTags(tags: string[]): string {
  const words = tags
    .flatMap((tag) => tag.split(/\s+/))
    .map((word) => word.trim())
    .filter(Boolean)
    .slice(0, 6);

  return normalizeCatalogTitle(words.join(" "));
}

type VisibleTextColor = "black" | "white" | "mixed" | "unknown";

function getPrimaryVisibleTextTitle(visibleText: string[] | undefined): string {
  if (!visibleText || visibleText.length === 0) {
    return "";
  }

  const nonGenericPhrases = visibleText
    .map((phrase) => phrase.trim())
    .filter(Boolean)
    .filter((phrase) => !isGenericCatalogTitle(phrase));

  if (nonGenericPhrases.length === 0) {
    return "";
  }

  const primaryPhrase = nonGenericPhrases[0] ?? "";

  return normalizeCatalogTitle(primaryPhrase);
}

function startsWithComparableTitle(title: string, prefix: string): boolean {
  const comparableTitle = normalizeComparableTitle(title);
  const comparablePrefix = normalizeComparableTitle(prefix);

  return Boolean(
    comparableTitle &&
    comparablePrefix &&
    comparableTitle.startsWith(comparablePrefix),
  );
}

function buildSupportingTitleWords(input: {
  candidateTitle?: string;
  primarySubject?: string;
  tags?: string[];
  visibleTextTitle: string;
}): string {
  const candidates = [
    input.candidateTitle,
    input.primarySubject,
    ...(input.tags ?? []),
  ];
  const visibleTokens = new Set(
    normalizeComparableTitle(input.visibleTextTitle).split(" "),
  );
  const supportingWords: string[] = [];

  for (const candidate of candidates) {
    const normalized = normalizeCatalogTitle(candidate ?? "");

    if (
      !normalized ||
      startsWithComparableTitle(normalized, input.visibleTextTitle)
    ) {
      continue;
    }

    if (isGenericCatalogTitle(normalized)) {
      continue;
    }

    for (const word of normalized.split(/\s+/)) {
      const comparableWord = normalizeComparableTitle(word);

      if (
        !comparableWord ||
        visibleTokens.has(comparableWord) ||
        isGenericCatalogTitle(word) ||
        BANNED_TITLE_STYLE_WORDS.has(comparableWord)
      ) {
        continue;
      }

      if (
        !supportingWords.some(
          (existing) => normalizeComparableTitle(existing) === comparableWord,
        )
      ) {
        supportingWords.push(word);
      }

      if (supportingWords.length >= 3) {
        return supportingWords.join(" ");
      }
    }
  }

  return supportingWords.join(" ");
}

function candidateMatchesLaterVisibleSegment(
  candidateTitle: string,
  visibleText: string[] | undefined,
): boolean {
  if (!visibleText || visibleText.length <= 1) {
    return false;
  }

  const comparableCandidate = normalizeComparableTitle(candidateTitle);

  if (!comparableCandidate) {
    return false;
  }

  for (const phrase of visibleText.slice(1)) {
    const segmentTitle = normalizeComparableTitle(
      normalizeCatalogTitle(phrase),
    );

    if (!segmentTitle) {
      continue;
    }

    if (
      segmentTitle.startsWith(comparableCandidate) ||
      comparableCandidate.startsWith(segmentTitle)
    ) {
      return true;
    }
  }

  return false;
}

function buildTitleFromVisibleText(input: {
  candidateTitle?: string;
  primarySubject?: string;
  tags?: string[];
  visibleText?: string[];
}): string {
  const visibleTextTitle = getPrimaryVisibleTextTitle(input.visibleText);

  if (!visibleTextTitle) {
    return "";
  }

  const rawCandidate = (input.candidateTitle ?? "").trim();
  const candidateTitle = normalizeCatalogTitle(rawCandidate);

  if (
    candidateTitle &&
    startsWithComparableTitle(candidateTitle, visibleTextTitle)
  ) {
    return stripTrailingTitlePunctuation(candidateTitle);
  }

  const candidateIsWrongSegment =
    Boolean(candidateTitle) &&
    !startsWithComparableTitle(candidateTitle, visibleTextTitle) &&
    (hasTrailingTitlePunctuation(rawCandidate) ||
      candidateMatchesLaterVisibleSegment(candidateTitle, input.visibleText));

  if (candidateIsWrongSegment) {
    return visibleTextTitle;
  }

  const visibleWordCount = visibleTextTitle.split(/\s+/).filter(Boolean).length;

  if (visibleWordCount >= 5) {
    return visibleTextTitle;
  }

  const supportingWords = buildSupportingTitleWords({
    candidateTitle: input.candidateTitle,
    primarySubject: input.primarySubject,
    tags: input.tags,
    visibleTextTitle,
  });

  return stripTrailingTitlePunctuation(
    normalizeCatalogTitle(`${visibleTextTitle} ${supportingWords}`.trim()),
  );
}

function appendTextColorSuffix(
  title: string,
  visibleTextColor?: VisibleTextColor,
  textOnlyArtwork?: boolean,
): string {
  const cleanedTitle = stripTextColorSuffixFromTitle(title);

  if (textOnlyArtwork !== true) {
    return cleanedTitle;
  }

  if (visibleTextColor !== "black" && visibleTextColor !== "white") {
    return cleanedTitle;
  }

  const suffix = visibleTextColor === "black" ? "Black Text" : "White Text";

  if (
    normalizeComparableTitle(cleanedTitle).endsWith(
      normalizeComparableTitle(suffix),
    )
  ) {
    return cleanedTitle;
  }

  return `${cleanedTitle} ${suffix}`.trim();
}

export function stripTextColorSuffixFromTitle(title: string): string {
  const cleanedTitle = stripTrailingTitlePunctuation(title.trim());

  if (!cleanedTitle) {
    return "";
  }

  const comparable = normalizeComparableTitle(cleanedTitle);

  if (comparable.endsWith("black text")) {
    return stripTrailingTitlePunctuation(
      cleanedTitle.replace(/\s+black\s+text$/i, "").trim(),
    );
  }

  if (comparable.endsWith("white text")) {
    return stripTrailingTitlePunctuation(
      cleanedTitle.replace(/\s+white\s+text$/i, "").trim(),
    );
  }

  return cleanedTitle;
}

export function normalizeTextOnlyArtwork(value: unknown): boolean | undefined {
  if (typeof value === "boolean") {
    return value;
  }

  return undefined;
}

export function resolveCatalogTitle(input: {
  candidateTitle?: string;
  primarySubject?: string;
  tags?: string[];
  uploadFileStem: string;
  visibleText?: string[];
  visibleTextColor?: VisibleTextColor;
  textOnlyArtwork?: boolean;
  artworkContainsText?: boolean;
  description?: string;
}): string {
  const sanitizedCandidate =
    input.textOnlyArtwork === true
      ? input.candidateTitle
      : input.candidateTitle
        ? stripTextColorSuffixFromTitle(input.candidateTitle)
        : undefined;

  const visibleTextTitle = buildTitleFromVisibleText({
    candidateTitle: sanitizedCandidate,
    primarySubject: input.primarySubject,
    tags: input.tags,
    visibleText: input.visibleText,
  });

  if (visibleTextTitle && !isGenericCatalogTitle(visibleTextTitle)) {
    return appendTextColorSuffix(
      visibleTextTitle,
      input.visibleTextColor,
      input.textOnlyArtwork,
    );
  }

  const textIndicated =
    input.artworkContainsText === true ||
    Boolean(input.visibleText?.length) ||
    Boolean(input.description?.trim());

  if (textIndicated) {
    const descriptionTitle = extractPrimaryWordingFromDescription(
      input.description,
    );

    if (descriptionTitle && !isGenericCatalogTitle(descriptionTitle)) {
      return appendTextColorSuffix(
        descriptionTitle,
        input.visibleTextColor,
        input.textOnlyArtwork,
      );
    }
  }

  const candidates = [sanitizedCandidate, input.primarySubject].filter(
    (value): value is string => Boolean(value?.trim()),
  );

  for (const candidate of candidates) {
    const normalized = normalizeCatalogTitle(candidate);

    if (
      !normalized ||
      isGenericCatalogTitle(normalized) ||
      isStyleWordHeavyTitle(normalized)
    ) {
      continue;
    }

    if (!isFilenameLikeTitle(normalized, input.uploadFileStem)) {
      return appendTextColorSuffix(
        normalized,
        input.visibleTextColor,
        input.textOnlyArtwork,
      );
    }
  }

  return appendTextColorSuffix(
    "Artwork Design",
    input.visibleTextColor,
    input.textOnlyArtwork,
  );
}

/**
 * Lean-schema title resolution for the playground-style contract.
 *
 * Prefers structured readable-text lines when present. Trusts a good model title with light
 * normalization (no 6-word OCR truncate). When the model title is empty, filename-like, generic,
 * style/tag-word heavy, description-like prose, or suspiciously incomplete versus the
 * description's readable phrase, prefers readable wording (structured lines or guarded
 * description extraction — never a description first-sentence copy). Optionally appends one
 * concise central subject. Never synthesizes a title by joining tags.
 *
 * For no-visible-text artwork, a short non-generic model title may still be materially
 * under-specific when Smart Profile subjects/objects already carry a richer identity — in that
 * case a deterministic enrich/rebuild runs (subjects/objects only; not themes/styles/tags).
 *
 * Intentionally does not replace a non-style title merely because it differs from the
 * description's leading transcription (e.g. keep "Motherhood Skeleton Rock On" when the
 * description leads with a longer slogan).
 */
export function resolveLeanCatalogTitle(input: {
  candidateTitle?: string;
  tags?: string[];
  uploadFileStem: string;
  description?: string;
  readableTextLines?: string[];
  centralSubject?: string;
  /** Smart Profile subjects — used only for no-text under-specific title enrichment. */
  subjects?: readonly string[];
  /** Smart Profile objects — used only for no-text under-specific title enrichment. */
  objects?: readonly string[];
}): string {
  const sanitizedLines = sanitizeMeaningfulVisibleTextPhrases(
    input.readableTextLines,
  );
  const hasMeaningfulReadableText = Boolean(sanitizedLines?.length);

  const fromReadableLines = buildTitleFromReadableTextLines(
    sanitizedLines,
    input.centralSubject,
    LEAN_CATALOG_TITLE_MAX_WORDS,
  );

  const readablePhraseOnly = buildTitleFromReadableTextLines(
    sanitizedLines,
    undefined,
    LEAN_CATALOG_TITLE_MAX_WORDS,
  );

  const normalizedCandidate = normalizeCatalogTitle(
    input.candidateTitle ?? "",
    LEAN_CATALOG_TITLE_MAX_WORDS,
  );

  const candidateUnusable =
    !normalizedCandidate ||
    isGenericCatalogTitle(normalizedCandidate) ||
    isFilenameLikeTitle(normalizedCandidate, input.uploadFileStem) ||
    isStyleWordHeavyTitle(normalizedCandidate) ||
    isDescriptionLikeCatalogTitle(normalizedCandidate) ||
    isIncompleteTitleVsDescription(normalizedCandidate, input.description) ||
    looksLikeOcrDumpTitle(input.candidateTitle) ||
    looksLikeOcrDumpTitle(normalizedCandidate);

  let resolved: string;

  if (fromReadableLines) {
    const candidateIncludesReadable =
      Boolean(readablePhraseOnly) &&
      Boolean(normalizedCandidate) &&
      normalizeComparableTitle(normalizedCandidate).includes(
        normalizeComparableTitle(readablePhraseOnly),
      );

    const candidateTokenOverlap =
      Boolean(normalizedCandidate) &&
      Boolean(sanitizedLines?.length) &&
      titleSharesMeaningfulReadableTokens(normalizedCandidate, sanitizedLines);

    if (
      !candidateUnusable &&
      (candidateIncludesReadable || candidateTokenOverlap) &&
      !isDescriptionLikeCatalogTitle(normalizedCandidate)
    ) {
      resolved = stripTrailingTitlePunctuation(normalizedCandidate);
    } else {
      resolved = fromReadableLines;
    }
  } else if (!candidateUnusable) {
    resolved = stripTrailingTitlePunctuation(normalizedCandidate);
  } else {
    const fromDescription = resolveReadableWordingForTitle(
      input.description,
      normalizedCandidate,
      LEAN_CATALOG_TITLE_MAX_WORDS,
    );

    const fromDescriptionWithSubject = fromDescription
      ? buildTitleFromReadableTextLines(
          [fromDescription],
          input.centralSubject,
          LEAN_CATALOG_TITLE_MAX_WORDS,
        ) || fromDescription
      : "";

    if (
      fromDescriptionWithSubject &&
      !isGenericCatalogTitle(fromDescriptionWithSubject) &&
      !isStyleWordHeavyTitle(fromDescriptionWithSubject) &&
      !isDescriptionLikeCatalogTitle(fromDescriptionWithSubject) &&
      !looksLikeOcrDumpTitle(fromDescriptionWithSubject)
    ) {
      resolved = stripTrailingTitlePunctuation(fromDescriptionWithSubject);
    } else if (
      normalizedCandidate &&
      !isGenericCatalogTitle(normalizedCandidate) &&
      !isFilenameLikeTitle(normalizedCandidate, input.uploadFileStem) &&
      !isStyleWordHeavyTitle(normalizedCandidate) &&
      !isDescriptionLikeCatalogTitle(normalizedCandidate) &&
      !looksLikeOcrDumpTitle(normalizedCandidate)
    ) {
      resolved = stripTrailingTitlePunctuation(normalizedCandidate);
    } else {
      const subjectOnly = sanitizeCentralSubjectPhrase(input.centralSubject);
      if (
        subjectOnly &&
        !isGenericCatalogTitle(subjectOnly) &&
        !looksLikeOcrDumpTitle(subjectOnly)
      ) {
        resolved = stripTrailingTitlePunctuation(
          normalizeCatalogTitle(subjectOnly, LEAN_CATALOG_TITLE_MAX_WORDS),
        );
      } else {
        resolved = "Artwork Design";
      }
    }
  }

  if (hasMeaningfulReadableText) {
    return resolved;
  }

  return enrichUnderSpecificNoTextCatalogTitle({
    title: resolved,
    subjects: input.subjects,
    objects: input.objects,
  });
}

/** Weak / non-identity subject tokens that must not drive title enrichment. */
const WEAK_TITLE_ENRICHMENT_SUBJECT_TOKENS = new Set([
  "person",
  "people",
  "man",
  "woman",
  "human",
  "figure",
  "figures",
  "character",
  "characters",
]);

/** Low-value objects that must not be appended as distinguishing title features. */
const WEAK_TITLE_ENRICHMENT_OBJECT_TOKENS = new Set([
  "background",
  "foreground",
  "sky",
  "ground",
  "floor",
  "shadow",
  "shadows",
  "border",
  "frame",
  "mat",
  "canvas",
  "backdrop",
  "sparkle",
  "sparkles",
  "star",
  "stars",
  "line",
  "lines",
]);

const MAX_TITLE_ENRICHMENT_OBJECTS = 2;

/**
 * Titles with more than this many comparable words are treated as already specific enough
 * for the no-text under-specific enricher (preserves Highland-class long descriptive titles).
 */
const UNDER_SPECIFIC_TITLE_MAX_WORDS = 2;

function isWeakTitleEnrichmentSubject(comparable: string): boolean {
  const words = comparable.split(" ").filter(Boolean);
  return (
    words.length > 0 &&
    words.every((word) => WEAK_TITLE_ENRICHMENT_SUBJECT_TOKENS.has(word))
  );
}

function isWeakTitleEnrichmentObject(comparable: string): boolean {
  const words = comparable.split(" ").filter(Boolean);
  return (
    words.length > 0 &&
    words.every((word) => WEAK_TITLE_ENRICHMENT_OBJECT_TOKENS.has(word))
  );
}

const INVARIANT_PLURAL_OBJECT_TOKENS = new Set([
  "glasses",
  "sunglasses",
  "pants",
  "jeans",
  "shorts",
  "scissors",
  "tweezers",
  "clothes",
  "binoculars",
]);

function singularizeTitleObjectToken(token: string): string {
  if (token.length <= 3) {
    return token;
  }
  if (INVARIANT_PLURAL_OBJECT_TOKENS.has(token)) {
    return token;
  }
  if (token.endsWith("ss") || token.endsWith("us") || token.endsWith("is")) {
    return token;
  }
  if (token.endsWith("ies") && token.length > 4) {
    return `${token.slice(0, -3)}y`;
  }
  if (
    token.endsWith("ses") ||
    token.endsWith("xes") ||
    token.endsWith("zes") ||
    token.endsWith("ches") ||
    token.endsWith("shes")
  ) {
    return token.slice(0, -2);
  }
  if (token.endsWith("s")) {
    return token.slice(0, -1);
  }
  return token;
}

function titleCaseEnrichmentPhrase(phrase: string): string {
  return normalizeCatalogTitle(phrase, LEAN_CATALOG_TITLE_MAX_WORDS);
}

/**
 * Prefer a subject that is a richer identity than the short title (e.g. poodle over dog,
 * highland cow over cow). Does not invent identities absent from subjects.
 */
export function selectMoreSpecificSubjectForTitle(
  subjects: readonly string[] | undefined,
  titleComparable: string,
): string | undefined {
  if (!subjects?.length || !titleComparable) {
    return undefined;
  }

  const normalized = subjects
    .map((raw) => ({
      raw: raw.trim(),
      comparable: normalizeComparableTitle(raw),
    }))
    .filter(
      (entry) =>
        entry.raw &&
        entry.comparable &&
        !isWeakTitleEnrichmentSubject(entry.comparable),
    );

  if (normalized.length === 0) {
    return undefined;
  }

  const titleWords = titleComparable.split(" ").filter(Boolean);

  // Compound subject that contains the title tokens as a proper subset (cow → highland cow).
  const compounds = normalized.filter((entry) => {
    if (entry.comparable === titleComparable) {
      return false;
    }
    const words = entry.comparable.split(" ").filter(Boolean);
    return (
      titleWords.length > 0 &&
      titleWords.every((word) => words.includes(word)) &&
      words.length > titleWords.length
    );
  });
  if (compounds.length > 0) {
    compounds.sort(
      (a, b) => b.comparable.split(" ").length - a.comparable.split(" ").length,
    );
    return compounds[0]?.raw;
  }

  // Title matches one subject exactly; another distinct subject exists (dog + poodle).
  const titleIsSubject = normalized.some(
    (entry) => entry.comparable === titleComparable,
  );
  const others = normalized.filter(
    (entry) => entry.comparable !== titleComparable,
  );
  if (titleIsSubject && others.length > 0) {
    others.sort(
      (a, b) => b.comparable.split(" ").length - a.comparable.split(" ").length,
    );
    return others[0]?.raw;
  }

  return undefined;
}

function selectDistinguishingObjectsForTitle(
  objects: readonly string[] | undefined,
  titleComparable: string,
  subjectComparable: string,
): string[] {
  if (!objects?.length) {
    return [];
  }

  const selected: string[] = [];
  for (const raw of objects) {
    const trimmed = raw.trim();
    if (!trimmed) {
      continue;
    }
    const comparable = normalizeComparableTitle(trimmed);
    if (!comparable || isWeakTitleEnrichmentObject(comparable)) {
      continue;
    }
    if (
      titleComparable.includes(comparable) ||
      subjectComparable.includes(comparable)
    ) {
      continue;
    }
    const singularWords = comparable
      .split(" ")
      .filter(Boolean)
      .map(singularizeTitleObjectToken)
      .join(" ");
    if (!singularWords) {
      continue;
    }
    if (
      selected.some(
        (existing) => normalizeComparableTitle(existing) === singularWords,
      )
    ) {
      continue;
    }
    selected.push(singularWords);
    if (selected.length >= MAX_TITLE_ENRICHMENT_OBJECTS) {
      break;
    }
  }
  return selected;
}

/**
 * When a no-text lean title collapses known visual identity to a broader/generic subject,
 * rebuild from Smart Profile subjects/objects only. Preserves titles that are already
 * sufficiently specific (including long descriptive Highland-class titles).
 */
export function enrichUnderSpecificNoTextCatalogTitle(input: {
  title: string;
  subjects?: readonly string[];
  objects?: readonly string[];
}): string {
  const original = stripTrailingTitlePunctuation(input.title?.trim() ?? "");
  if (!original || original === "Artwork Design") {
    return original || "Artwork Design";
  }

  const titleComparable = normalizeComparableTitle(original);
  const titleWords = titleComparable.split(" ").filter(Boolean);

  // Already specific enough (incl. long / sentence-like descriptive titles).
  if (titleWords.length > UNDER_SPECIFIC_TITLE_MAX_WORDS) {
    return original;
  }

  const moreSpecificSubject = selectMoreSpecificSubjectForTitle(
    input.subjects,
    titleComparable,
  );
  const subjectForObjects =
    moreSpecificSubject ??
    (input.subjects ?? []).find(
      (subject) => normalizeComparableTitle(subject) === titleComparable,
    ) ??
    original;
  const subjectComparable = normalizeComparableTitle(subjectForObjects);
  const distinguishingObjects = selectDistinguishingObjectsForTitle(
    input.objects,
    titleComparable,
    subjectComparable,
  );

  const needsSubjectUpgrade = Boolean(
    moreSpecificSubject &&
    normalizeComparableTitle(moreSpecificSubject) !== titleComparable,
  );
  const needsObjectEnrichment = distinguishingObjects.length > 0;

  if (!needsSubjectUpgrade && !needsObjectEnrichment) {
    return original;
  }

  let rebuilt = titleCaseEnrichmentPhrase(
    needsSubjectUpgrade ? moreSpecificSubject! : original,
  );
  if (needsObjectEnrichment) {
    const objectPhrase =
      distinguishingObjects.length === 1
        ? titleCaseEnrichmentPhrase(distinguishingObjects[0]!)
        : titleCaseEnrichmentPhrase(
            `${distinguishingObjects[0]} And ${distinguishingObjects[1]}`,
          );
    rebuilt = titleCaseEnrichmentPhrase(`${rebuilt} With ${objectPhrase}`);
  }

  if (
    !rebuilt ||
    isGenericCatalogTitle(rebuilt) ||
    isDescriptionLikeCatalogTitle(rebuilt) ||
    isStyleWordHeavyTitle(rebuilt) ||
    looksLikeOcrDumpTitle(rebuilt)
  ) {
    return original;
  }

  if (normalizeComparableTitle(rebuilt) === titleComparable) {
    return original;
  }

  // Prefer the enriched title only when it clearly adds identity (more tokens or upgraded subject).
  const rebuiltWords = normalizeComparableTitle(rebuilt)
    .split(" ")
    .filter(Boolean);
  if (rebuiltWords.length < titleWords.length) {
    return original;
  }

  return stripTrailingTitlePunctuation(rebuilt);
}

export function normalizeVisibleTextPhrases(
  value: unknown,
): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const phrases = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12);

  return phrases.length > 0 ? phrases : undefined;
}

export function normalizeVisibleTextColor(
  value: unknown,
): VisibleTextColor | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.toLowerCase().trim();

  if (
    normalized === "black" ||
    normalized === "white" ||
    normalized === "mixed" ||
    normalized === "unknown"
  ) {
    return normalized;
  }

  return undefined;
}

const MAX_AI_TAG_LENGTH = 40;

const TAG_STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "been",
  "being",
  "but",
  "by",
  "for",
  "from",
  "he",
  "her",
  "him",
  "his",
  "i",
  "if",
  "im",
  "in",
  "is",
  "it",
  "its",
  "me",
  "my",
  "not",
  "of",
  "on",
  "or",
  "our",
  "she",
  "so",
  "that",
  "the",
  "their",
  "them",
  "they",
  "this",
  "to",
  "was",
  "we",
  "were",
  "with",
  "you",
  "your",
]);

export function tokenizeTagCandidate(value: string): string[] {
  const normalized = value.toLowerCase().replace(/['’]/g, " ").trim();

  return normalized
    .split(/[^a-z0-9-]+/)
    .map((token) => token.trim())
    .filter(
      (token) =>
        token.length > 1 &&
        token.length <= MAX_AI_TAG_LENGTH &&
        !TAG_STOPWORDS.has(token),
    );
}

function pushNormalizedTag(normalizedTags: string[], value: string): void {
  normalizedTags.push(...tokenizeTagCandidate(value));
}

export function normalizeAiTags(
  value: unknown,
  _visibleText?: string[],
  maxTags = 20,
  exclusions: readonly string[] = mergeTagExclusions(),
): string[] {
  const normalizedTags: string[] = [];

  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === "string") {
        pushNormalizedTag(normalizedTags, item);
      }
    }
  }

  const deduped = [...new Set(normalizedTags)].filter(
    (tag) => !GENERIC_CATALOG_TAGS.has(tag),
  );

  return filterExcludedAiTags(deduped, exclusions).slice(0, maxTags);
}
