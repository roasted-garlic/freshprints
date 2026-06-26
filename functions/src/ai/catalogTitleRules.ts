import { buildTagExclusionPromptSection, filterExcludedAiTags, mergeTagExclusions } from "./aiTagExclusions";

const VERSION_PATTERN = /[\s-]+(?:v|version)\s*\d+$/i;
const TRAILING_NUMBER_PATTERN = /\s+\d+$/;
const TITLE_TOKEN_EDGE_PUNCTUATION = /^['"'""–—|,:;.,!?/\\-]+|['"'""–—|,:;.,!?/\\-]+$/g;
const TRAILING_TITLE_PUNCTUATION = /[\s–—|:;.,!?'"/\\]+$/;
const SEPARATOR_ONLY_TOKEN = /^[–—|-]+$/;

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

export const OPENAI_CATALOG_ENRICHMENT_PROMPT_VERSION = "catalog-enrich-openai-v11";
export const DEVELOPMENT_CATALOG_ENRICHMENT_PROMPT_VERSION = "catalog-enrich-dev-v11";

const CATALOG_ENRICHMENT_SYSTEM_PROMPT_BODY = `Catalog apparel artwork. OCR first — read ALL text regions before title, description, tags, or category.
Return JSON only: title,description,categoryName,tags,primarySubject,theme,style,audience,colorPalette,artworkContainsText,visibleText,visibleTextColor,textRecognitionConfidence,overallConfidence.
Order of importance: visible text, message, supporting art, style, colors.
Background/canvas: images are placed on a neutral grey analysis canvas for OCR only; that canvas is NOT part of the artwork. Never mention background, backdrop, canvas, matte, letterbox, or surrounding fill colors (grey, gray, white, black, neutral) in description, colorPalette, or tags. Describe only colors in the printable artwork (text ink, illustration fills, clothing, logos, stars). If the only color is the analysis canvas, omit it.
OCR: transcribe every readable word exactly. For curved or arched text, read the full arc left-to-right before choosing the primary phrase. Do not summarize or invent wording.
visibleText: array of EVERY distinct readable phrase or line in reading order (top arc segments left-to-right, then lower lines). For dash-separated slogans, one entry per segment in order — never skip the opening phrase. Include separate entries for stacked lines (e.g. MOTHERHOOD below an arc). First entry MUST be the primary slogan or headline exactly as shown.
Title: when readable text exists, use the first 6 Title Case words of visibleText[0] only — never a middle or later segment. NEVER end the title with punctuation or separators (- – — | : ; . , ! ? / \\) or a dangling separator-only word. If word 6 would be a separator, stop at word 5. NEVER use generic labels such as Text, Typography, Quote, Words, Label, Saying, Slogan, Lettering, Font, Type, or Caption. If no readable text, title the artwork subject. Never use filenames. Add "Black Text" or "White Text" only when all readable title text is that color.
Description when artworkContainsText is true: sentence 1 MUST transcribe every visibleText phrase exactly in order, joined with " / " between segments — include all readable words before any art description. Sentence 2: one sentence on supporting art only (illustration, characters, icons) — no canvas or background. Never skip readable text to describe art only.
Description when no readable text: describe the artwork subject and style only (no canvas).
categoryName: pick the allowed category that best matches the theme and message (motherhood, humor, music, animals, faith, etc.). Avoid unrelated generic categories (e.g. Toys for a motherhood slogan shirt).
Tags: 5-12 single-word lowercase catalog tags only. Each tag must be one reusable word with no spaces (examples: raccoon, funny, hoodie, animal, western, cartoon). Do NOT copy phrases from title, description, or visible text. Use subject, theme, style, and audience terms staff would search. Reuse broad tags such as funny for humorous or sarcastic designs. Tags must never include words from the exclusion list below.`;

export const CATALOG_ENRICHMENT_SYSTEM_PROMPT = buildCatalogEnrichmentSystemPrompt();

export function buildCatalogEnrichmentSystemPrompt(
  exclusions: readonly string[] = mergeTagExclusions(),
): string {
  return `${CATALOG_ENRICHMENT_SYSTEM_PROMPT_BODY}${buildTagExclusionPromptSection(exclusions)}`;
}

export function buildCatalogEnrichmentUserPrompt(categoryList: string): string {
  return `Allowed categories: ${categoryList}.
Use the image only. Read text before naming the artwork.
Ignore the grey analysis canvas; describe only the artwork itself.
Apply tag exclusion list; use apparel-friendly searchable tags only.`;
}

const BACKGROUND_PHRASE_PATTERNS = [
  /\s+on a (?:light |dark )?(?:gray|grey|white|black|neutral|charcoal)(?:\s+\w+)?\s+(?:background|backdrop|canvas|matte)\.?/gi,
  /\s+against a (?:light |dark )?(?:gray|grey|white|black|neutral|charcoal)(?:\s+\w+)?\s+(?:background|backdrop|canvas|matte)\.?/gi,
  /\s+with a (?:gray|grey|white|black|neutral|charcoal)(?:\s+\w+)?\s+(?:background|backdrop|canvas|matte)\.?/gi,
  /\s+set against (?:a )?(?:gray|grey|white|black|neutral|charcoal)\s+(?:background|backdrop|canvas)\.?/gi,
  /\s+surrounded by (?:a )?(?:gray|grey|white|black|neutral|charcoal)\s+(?:background|backdrop|canvas)\.?/gi,
];

const CANVAS_PALETTE_TERMS = new Set([
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

  return sanitized.replace(/\s{2,}/g, " ").replace(/\s+([,.!?])/g, "$1").trim();
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

      if (/\b(background|backdrop|canvas|matte|surrounding|neutral)\b/i.test(lower)) {
        return false;
      }

      if (/^(?:light |dark )?(?:gray|grey|white|black|charcoal)\b/i.test(lower)) {
        return false;
      }

      return true;
    });

  return filtered.length > 0 ? filtered : undefined;
}

export function normalizeCatalogTitle(rawTitle: string): string {
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
    .slice(0, 6);

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
  "words art",
  "word art",
  "lettering art",
  "typography art",
  "text art",
  "text design",
  "typography design",
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

  if (words.length <= 2 && words.every((word) => GENERIC_CATALOG_TITLE_TOKENS.has(word))) {
    return true;
  }

  return false;
}

export function extractPrimaryWordingFromDescription(description: string | undefined): string {
  if (!description?.trim()) {
    return "";
  }

  const quotedMatch = description.match(/"([^"]+)"|'([^']+)'/);

  if (quotedMatch) {
    return normalizeCatalogTitle((quotedMatch[1] ?? quotedMatch[2] ?? "").trim());
  }

  const firstSentence = description.split(/[.!?]/)[0]?.trim() ?? "";

  if (!firstSentence) {
    return "";
  }

  return normalizeCatalogTitle(firstSentence);
}

export function isFilenameLikeTitle(suggestedTitle: string, uploadFileStem: string): boolean {
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

  const overlap = uploadTokens.filter((token) => suggestedTokens.has(token)).length;
  const overlapRatio = overlap / uploadTokens.length;

  return overlapRatio >= 0.75 && uploadTokens.length >= 2;
}

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

  return Boolean(comparableTitle && comparablePrefix && comparableTitle.startsWith(comparablePrefix));
}

function buildSupportingTitleWords(input: {
  candidateTitle?: string;
  primarySubject?: string;
  tags?: string[];
  visibleTextTitle: string;
}): string {
  const candidates = [input.candidateTitle, input.primarySubject, ...(input.tags ?? [])];
  const visibleTokens = new Set(normalizeComparableTitle(input.visibleTextTitle).split(" "));
  const supportingWords: string[] = [];

  for (const candidate of candidates) {
    const normalized = normalizeCatalogTitle(candidate ?? "");

    if (!normalized || startsWithComparableTitle(normalized, input.visibleTextTitle)) {
      continue;
    }

    if (isGenericCatalogTitle(normalized)) {
      continue;
    }

    for (const word of normalized.split(/\s+/)) {
      const comparableWord = normalizeComparableTitle(word);

      if (!comparableWord || visibleTokens.has(comparableWord) || isGenericCatalogTitle(word)) {
        continue;
      }

      if (!supportingWords.some((existing) => normalizeComparableTitle(existing) === comparableWord)) {
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
    const segmentTitle = normalizeComparableTitle(normalizeCatalogTitle(phrase));

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

  if (candidateTitle && startsWithComparableTitle(candidateTitle, visibleTextTitle)) {
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

function appendTextColorSuffix(title: string, visibleTextColor?: VisibleTextColor): string {
  const cleanedTitle = stripTrailingTitlePunctuation(title);

  if (visibleTextColor !== "black" && visibleTextColor !== "white") {
    return cleanedTitle;
  }

  const suffix = visibleTextColor === "black" ? "Black Text" : "White Text";

  if (normalizeComparableTitle(cleanedTitle).endsWith(normalizeComparableTitle(suffix))) {
    return cleanedTitle;
  }

  return `${cleanedTitle} ${suffix}`.trim();
}

export function resolveCatalogTitle(input: {
  candidateTitle?: string;
  primarySubject?: string;
  tags?: string[];
  uploadFileStem: string;
  visibleText?: string[];
  visibleTextColor?: VisibleTextColor;
  artworkContainsText?: boolean;
  description?: string;
}): string {
  const visibleTextTitle = buildTitleFromVisibleText({
    candidateTitle: input.candidateTitle,
    primarySubject: input.primarySubject,
    tags: input.tags,
    visibleText: input.visibleText,
  });

  if (visibleTextTitle && !isGenericCatalogTitle(visibleTextTitle)) {
    return appendTextColorSuffix(visibleTextTitle, input.visibleTextColor);
  }

  const textIndicated =
    input.artworkContainsText === true ||
    Boolean(input.visibleText?.length) ||
    Boolean(input.description?.trim());

  if (textIndicated) {
    const descriptionTitle = extractPrimaryWordingFromDescription(input.description);

    if (descriptionTitle && !isGenericCatalogTitle(descriptionTitle)) {
      return appendTextColorSuffix(descriptionTitle, input.visibleTextColor);
    }
  }

  const candidates = [
    input.candidateTitle,
    input.primarySubject,
    buildTitleFromTags(input.tags ?? []),
  ].filter((value): value is string => Boolean(value?.trim()));

  for (const candidate of candidates) {
    const normalized = normalizeCatalogTitle(candidate);

    if (!normalized || isGenericCatalogTitle(normalized)) {
      continue;
    }

    if (!isFilenameLikeTitle(normalized, input.uploadFileStem)) {
      return appendTextColorSuffix(normalized, input.visibleTextColor);
    }
  }

  const fallback = buildTitleFromTags(input.tags ?? []);

  if (fallback && !isGenericCatalogTitle(fallback)) {
    return appendTextColorSuffix(fallback, input.visibleTextColor);
  }

  return appendTextColorSuffix("Artwork Design", input.visibleTextColor);
}

export function normalizeVisibleTextPhrases(value: unknown): string[] | undefined {
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

export function normalizeVisibleTextColor(value: unknown): VisibleTextColor | undefined {
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

const TAG_ALIASES: Record<string, string> = {
  comedic: "funny",
  comedy: "funny",
  humor: "funny",
  humorous: "funny",
  joke: "funny",
  jokes: "funny",
};

const TAG_COMPANIONS: Record<string, string[]> = {
  sarcastic: ["funny"],
  sassy: ["funny"],
  snarky: ["funny"],
  witty: ["funny"],
};

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

function tokenizeTagCandidate(value: string): string[] {
  const normalized = value.toLowerCase().replace(/['’]/g, " ").trim();

  return normalized
    .split(/[^a-z0-9-]+/)
    .map((token) => token.trim())
    .filter(
      (token) =>
        token.length > 1 && token.length <= MAX_AI_TAG_LENGTH && !TAG_STOPWORDS.has(token),
    );
}

function pushNormalizedTag(normalizedTags: string[], value: string): void {
  for (const token of tokenizeTagCandidate(value)) {
    const canonicalTag = TAG_ALIASES[token] ?? token;
    normalizedTags.push(canonicalTag);
    normalizedTags.push(...(TAG_COMPANIONS[canonicalTag] ?? []));
  }
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

  return filterExcludedAiTags([...new Set(normalizedTags)], exclusions).slice(0, maxTags);
}
