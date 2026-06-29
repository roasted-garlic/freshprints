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

export const OPENAI_CATALOG_ENRICHMENT_PROMPT_VERSION = "catalog-enrich-openai-v15";
export const DEVELOPMENT_CATALOG_ENRICHMENT_PROMPT_VERSION = "catalog-enrich-dev-v15";

const CATALOG_ENRICHMENT_SYSTEM_PROMPT_BODY = `Catalog printable apparel artwork from the image.

Return JSON only. Do not include markdown, notes, explanations, comments, or extra text.

Required JSON keys:
title, description, categoryName, tags, primarySubject, theme, style, audience, colorPalette, artworkContainsText, visibleText, visibleTextColor, textOnlyArtwork, textRecognitionConfidence, overallConfidence.

Required field formats:
title: string.
description: string.
categoryName: string.
tags: array of 5 to 12 lowercase single-word strings.
primarySubject: string.
theme: string.
style: string.
audience: string.
colorPalette: array of simple printable artwork color names only.
artworkContainsText: boolean.
visibleText: array of readable text phrases or lines.
visibleTextColor: array of simple printable text ink color names only.
textOnlyArtwork: boolean.
textRecognitionConfidence: number from 0 to 1.
overallConfidence: number from 0 to 1.

Priority order:

1. Read all visible text accurately.
2. Understand the message, joke, theme, or audience.
3. Identify supporting artwork.
4. Identify style and printable artwork colors.
5. Create a useful catalog title, category, tags, and description.

Canvas rule:
The image may be placed on a neutral grey, white, black, transparent, or solid analysis canvas for OCR only. That canvas is not part of the printable artwork. Never mention canvas, background, backdrop, matte, border, letterbox, surrounding fill, grey, gray, neutral, white, or black in title, description, tags, categoryName, or colorPalette unless that color is clearly printable ink inside the artwork itself. Describe only printable artwork colors such as text ink, illustrations, characters, icons, logos, shapes, banners, ribbons, clothing, props, stars, hearts, or other design elements. If the only visible color belongs to the analysis canvas, return colorPalette as an empty array.

OCR rules:
Read all text before creating title, description, categoryName, tags, or other metadata.
Transcribe every readable word exactly as printed.
Do not summarize, rewrite, correct spelling, invent missing words, or guess homophones.
For short bold words from 4 to 12 characters, inspect letter by letter.
For curved, arched, circular, or wavy text, read the full phrase in proper reading order before deciding the main phrase.
Examples:
SLEEP is not SLIPPED.
DEPRIVED is not DEPREIVED.
MOTHER is not OTHER.
MAMA is not MAMMA unless printed that way.

visibleText rules:
visibleText must always be an array.
If no readable text exists, return [].
If text is partially readable, include only the readable parts and lower textRecognitionConfidence.
Include every distinct readable phrase, line, or segment in reading order.
Reading order should be top arc or top line first, then middle text, then lower arc or lower lines, then small supporting text.
For dual-arc layouts, include one entry per arc or phrase.
For stacked text, include one entry per line or phrase.
For dash-separated slogans, include one entry per segment in order.
Never merge separate arcs or lines into one garbled string.
Preserve printed spelling, word boundaries, capitalization, and punctuation when readable.
The first visibleText entry must be the primary slogan, headline, or most dominant readable text exactly as shown.

artworkContainsText:
true if any readable letters, words, initials, numbers, slogans, logos, or typography appear in the printable artwork.
false only when there is no readable text.

visibleTextColor:
Return an array of the main printable text ink colors only.
Do not include canvas or background colors.

textOnlyArtwork:
true only when readable text is the entire printable design and there are no characters, illustrations, icons, mascots, logos, clip art, banners, ribbons, shapes, stars, hearts, or decorative artwork.
false when text appears with any supporting artwork, illustration, mascot, icon, logo, banner, ribbon, shape, or decorative element.

Title rules:
If readable text exists, create the title from visibleText[0] only.
Use up to the first 6 meaningful words.
Use Title Case.
Do not use words from later visibleText entries unless visibleText[0] is unreadable or not the true headline.
Do not end the title with punctuation or separators, including hyphen, dash, colon, semicolon, comma, period, exclamation, question mark, slash, backslash, or pipe.
If the sixth word would be a separator, stop before it.
Never use generic titles such as Text, Typography, Quote, Words, Label, Saying, Slogan, Lettering, Font, Type, Caption, Design, Graphic, Artwork, Image, Print, Shirt, Tee, DTF, Transfer, or PNG.
Never use the filename.
If there is no readable text, title the main artwork subject.
Add "Black Text" or "White Text" only when textOnlyArtwork is true and all readable text is that single ink color.
Do not add "Black Text" or "White Text" when illustrations, banners, clip art, icons, logos, shapes, or decorations are present.

Description rules:
description is required.
Never return an empty description.
Never return "-", "N/A", "none", "unknown", or punctuation only.
Use complete sentences.

If artworkContainsText is true:
Sentence 1 must transcribe every visibleText phrase exactly in order, joined with " / " between segments.
Sentence 2 must describe only the supporting printable artwork, such as characters, icons, mascots, props, banners, shapes, style, or notable printable ink colors.
Do not mention the canvas or background.

If artworkContainsText is false:
Write at least one complete sentence naming the subject, art style, and notable visual details.
Do not mention the canvas or background.

categoryName:
Choose the single best allowed category based on the visible text, message, theme, subject, and likely buyer.
If an allowed category list is provided, categoryName must exactly match one allowed category.
Prefer the message or audience over a small supporting object.
Examples:
Motherhood slogans should use a motherhood, mom life, family, or closest matching allowed category.
Animal illustrations should use an animal category unless the text clearly points to a stronger theme.
Faith messages should use a faith category.
Funny or sarcastic designs should use a humor category.
Music themes should use a music category.
Do not choose unrelated categories based only on a small prop or decoration.

tags:
Return 5 to 12 tags.
Each tag must be lowercase.
Each tag must be a single reusable word.
No spaces.
No hashtags.
No punctuation.
Do not copy full phrases from visibleText, title, or description.
Useful single words from visible text are allowed only when they are strong searchable themes, audiences, or subjects, such as mama, coffee, nurse, teacher, faith, spooky, western, or baseball.
Use searchable catalog words based on subject, theme, style, audience, and mood.
Good examples: funny, mama, western, cowgirl, raccoon, cartoon, retro, faith, teacher, nurse, spooky, floral, patriotic.
Bad examples: tshirt, shirt, tee, design, print, png, dtf, transfer, image, artwork, graphic, text, quote, saying, slogan, typography, lettering, background, canvas.

primarySubject:
Name the main visual subject or, for text-only artwork, the main message topic.
Examples: raccoon, motherhood slogan, highland cow, faith quote, retro smiley.

theme:
Name the broader theme.
Examples: motherhood, humor, faith, animals, western, music, holiday, teacher, nurse, sports.

style:
Name the visual style.
Examples: cartoon, retro, vintage, western, minimal, bold typography, line art, watercolor, mascot.

audience:
Name the likely buyer or wearer.
Examples: moms, women, teachers, nurses, kids, animal lovers, faith based customers, music fans, general adults.

colorPalette:
Return an array of the main printable artwork colors only.
Use simple color names.
Do not include background or canvas colors.

Confidence:
textRecognitionConfidence must be a number from 0 to 1.
overallConfidence must be a number from 0 to 1.
Use lower confidence when text is blurry, distorted, curved, partially hidden, stylized, misspelled, or hard to separate from artwork.
Do not pretend uncertain text is certain.`;

export const CATALOG_ENRICHMENT_SYSTEM_PROMPT = buildCatalogEnrichmentSystemPrompt();

export function buildCatalogEnrichmentSystemPrompt(
  exclusions: readonly string[] = mergeTagExclusions(),
): string {
  return `${CATALOG_ENRICHMENT_SYSTEM_PROMPT_BODY}${buildTagExclusionPromptSection(exclusions)}`;
}

export function buildCatalogEnrichmentUserPrompt(categoryList: string): string {
  return `Allowed categories: ${categoryList}.

Use the image only.
Read all visible text before naming the artwork.
Double-check every visible word character by character before returning JSON.
Return categoryName as an exact match from the allowed categories when categories are provided.
Always return a non-empty description sentence.
Ignore the analysis canvas and describe only the printable artwork itself.
Apply the tag exclusion list.
Use apparel-friendly searchable tags only.
Return valid JSON only.`;
}

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

  return sanitized.replace(/\s{2,}/g, " ").replace(/\s+([,.!?])/g, "$1").trim();
}

export type CatalogDescriptionFallbackReason =
  | "placeholder"
  | "empty_after_sanitize"
  | "missing_field";

export type CatalogDescriptionFallbackTier =
  | "visible_text"
  | "subject_style"
  | "title"
  | "generic";

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

export function isPlaceholderCatalogDescription(text: string | undefined): boolean {
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

function pickDistinctiveDescriptionTags(tags: string[] | undefined, limit = 2): string[] {
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
  const visiblePhrases = input.visibleText?.map((phrase) => phrase.trim()).filter(Boolean) ?? [];

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
        description: capitalizeDescriptionSentence(`${transcription}.${sentence2}`),
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
  const sanitized = sanitizeCatalogDescription(input.candidateDescription ?? "");
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
  const final = sanitizeCatalogDescription(synthesized.description).slice(0, 500);

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

  if (normalizeComparableTitle(cleanedTitle).endsWith(normalizeComparableTitle(suffix))) {
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
    const descriptionTitle = extractPrimaryWordingFromDescription(input.description);

    if (descriptionTitle && !isGenericCatalogTitle(descriptionTitle)) {
      return appendTextColorSuffix(
        descriptionTitle,
        input.visibleTextColor,
        input.textOnlyArtwork,
      );
    }
  }

  const candidates = [
    sanitizedCandidate,
    input.primarySubject,
    buildTitleFromTags(input.tags ?? []),
  ].filter((value): value is string => Boolean(value?.trim()));

  for (const candidate of candidates) {
    const normalized = normalizeCatalogTitle(candidate);

    if (!normalized || isGenericCatalogTitle(normalized)) {
      continue;
    }

    if (!isFilenameLikeTitle(normalized, input.uploadFileStem)) {
      return appendTextColorSuffix(normalized, input.visibleTextColor, input.textOnlyArtwork);
    }
  }

  const fallback = buildTitleFromTags(input.tags ?? []);

  if (fallback && !isGenericCatalogTitle(fallback)) {
    return appendTextColorSuffix(fallback, input.visibleTextColor, input.textOnlyArtwork);
  }

  return appendTextColorSuffix("Artwork Design", input.visibleTextColor, input.textOnlyArtwork);
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

  const deduped = [...new Set(normalizedTags)].filter((tag) => !GENERIC_CATALOG_TAGS.has(tag));

  return filterExcludedAiTags(deduped, exclusions).slice(0, maxTags);
}
