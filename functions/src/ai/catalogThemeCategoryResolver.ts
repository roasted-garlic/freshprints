import { normalizeForAliasMatch } from "./catalogTagResolver";
import { normalizeComparableTitle } from "./catalogTitleRules";

const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "for",
  "in",
  "of",
  "or",
  "the",
  "to",
  "with",
]);

const MIN_RESOLVE_SCORE = 2;
const TOKEN_OVERLAP_WEIGHT = 1;
const PRIORITY_BOOST_WEIGHT = 4;

/** Distinct family signal tokens required before an exact match may be overridden. */
const DOMINANT_OVERRIDE_MIN_SIGNAL_HITS = 2;

/** Dual-gate joke-primary: (lexicalHits >= 2 AND jokeStructure) OR (lexicalHits >= 3). */
const JOKE_PRIMARY_LEXICAL_WITH_STRUCTURE = 2;
const JOKE_PRIMARY_LEXICAL_ALONE = 3;

/** Max token count for a short slogan-like visibleText line (supporting evidence only). */
const SHORT_SLOGAN_VISIBLE_TEXT_MAX_TOKENS = 6;

export interface ResolveThemeCategoryInput {
  rawCategory?: string;
  title?: string;
  description?: string;
  visibleText?: string[];
  matchedTags: readonly string[];
  /** Enrichment-parse Smart Profile dimensions (available before final category resolve). */
  subjects?: readonly string[];
  objects?: readonly string[];
  /** Art / aesthetic style phrases (e.g. cute, whimsical) — durable discovery evidence. */
  styles?: readonly string[];
  themes?: readonly string[];
  interests?: readonly string[];
  /** Jobs/roles/groups from enrichment parse — durable evidence (e.g. musicians). */
  professionsGroups?: readonly string[];
  searchConcepts?: readonly string[];
  approvedCategories: readonly { id: string; name: string; description?: string }[];
}

export interface ResolveThemeCategoryResult {
  categoryName?: string;
  categoryId?: string;
}

function tokenize(value: string | undefined): string[] {
  if (!value?.trim()) {
    return [];
  }

  return normalizeComparableTitle(value)
    .split(" ")
    .filter((token) => token.length > 2 && !STOPWORDS.has(token));
}

/**
 * Buyer-intent / theme priority families. Each family lists the signal tokens that indicate the
 * theme, and the tokens an approved category's name+description must contain to receive the
 * boost. These are score boosts, not hardcoded category-name overrides — they compete on the same
 * scoring basis as plain token overlap, so a raw model category (even one naming a wrong category
 * outright, e.g. "Humorous Quotes") never gets special standing over a correctly-boosted category.
 */
interface PriorityFamily {
  signalTokens: ReadonlySet<string>;
  categoryTokens: ReadonlySet<string>;
}

const FAMILY_PRIORITY: PriorityFamily = {
  signalTokens: new Set([
    "motherhood",
    "mother",
    "mom",
    "moms",
    "mommy",
    "parenting",
    "parent",
    "parents",
    "fatherhood",
    "father",
    "dad",
    "dads",
    "daddy",
    "family",
  ]),
  categoryTokens: new Set(["family", "parenting", "motherhood", "fatherhood"]),
};

const FAITH_PRIORITY: PriorityFamily = {
  signalTokens: new Set([
    "faith",
    "faithful",
    "god",
    "jesus",
    "christ",
    "christian",
    "bible",
    "biblical",
    "church",
    "pray",
    "prayer",
    "blessed",
    "religious",
    "religion",
    "gospel",
    "worship",
  ]),
  categoryTokens: new Set(["faith", "religious", "christian", "spiritual"]),
};

const TEACHER_PRIORITY: PriorityFamily = {
  signalTokens: new Set([
    "teacher",
    "teachers",
    "teaching",
    "school",
    "classroom",
    "student",
    "students",
    "education",
    "educator",
    "educators",
  ]),
  categoryTokens: new Set(["teacher", "teachers", "teaching", "school", "education", "educator"]),
};

const HUMOR_PRIORITY: PriorityFamily = {
  signalTokens: new Set([
    "funny",
    "humor",
    "humorous",
    "joke",
    "jokes",
    "comedy",
    "comedic",
    "sarcastic",
    "sarcasm",
    "snark",
    "witty",
    "attitude",
  ]),
  categoryTokens: new Set(["funny", "humor", "humorous", "comedy", "sarcastic", "sarcasm"]),
};

const CANNABIS_PRIORITY: PriorityFamily = {
  signalTokens: new Set([
    "cannabis",
    "marijuana",
    "weed",
    "420",
    "stoner",
    "pot",
    "thc",
    "ganja",
  ]),
  categoryTokens: new Set(["cannabis", "marijuana", "weed", "420", "stoner"]),
};

const ASTROLOGY_PRIORITY: PriorityFamily = {
  signalTokens: new Set([
    "zodiac",
    "astrology",
    "horoscope",
    "aries",
    "taurus",
    "gemini",
    "cancer",
    "leo",
    "virgo",
    "libra",
    "scorpio",
    "sagittarius",
    "capricorn",
    "aquarius",
    "pisces",
  ]),
  categoryTokens: new Set(["zodiac", "astrology", "horoscope", "celestial", "astro"]),
};

/** Boosts Pop Culture when franchise/fandom signals are present (protects vs Family). */
const FRANCHISE_POP_PRIORITY: PriorityFamily = {
  signalTokens: new Set([
    "franchise",
    "fandom",
    "movie",
    "movies",
    "series",
    "marvel",
    "disney",
    "starwars",
    "anime",
    "nintendo",
    "pokemon",
    "celebrity",
    "darth",
    "vader",
    "grogu",
    "bobafett",
  ]),
  categoryTokens: new Set(["pop", "culture", "character", "characters", "franchise"]),
};

/**
 * Music-domain evidence for Music & Bands (fallback boost + Pop→Music exact override).
 * Deliberately omits bare "rock"/"metal"/"country" — too easy to hit non-music copy.
 * No artist/band proper names.
 */
const MUSIC_PRIORITY: PriorityFamily = {
  signalTokens: new Set([
    "music",
    "musical",
    "musician",
    "musicians",
    "band",
    "bands",
    "singer",
    "singers",
    "album",
    "albums",
    "song",
    "songs",
    "concert",
    "concerts",
    "tour",
    "tours",
    "guitar",
    "guitars",
    "drums",
    "drummer",
    "dj",
    "lyrics",
    "playlist",
    "vinyl",
    "karaoke",
  ]),
  categoryTokens: new Set(["music", "band", "bands", "musician", "musicians"]),
};

/** Explicit music-product identity cues (stronger than a lone "music" hobby word). */
const MUSIC_IDENTITY_TOKENS = new Set([
  "band",
  "bands",
  "musician",
  "musicians",
  "singer",
  "singers",
  "album",
  "albums",
  "song",
  "songs",
  "concert",
  "concerts",
  "tour",
  "tours",
  "guitar",
  "guitars",
  "drums",
  "drummer",
  "dj",
  "lyrics",
]);

/**
 * Non-music Pop media / franchise blockers for Music-vs-Pop override only.
 * Extends franchise signals with cartoon/TV/game/meme so Scooby-class designs stay Pop.
 */
const POP_MEDIA_BLOCK_FOR_MUSIC: PriorityFamily = {
  signalTokens: new Set([
    ...FRANCHISE_POP_PRIORITY.signalTokens,
    "cartoon",
    "cartoons",
    "animation",
    "animated",
    "television",
    "gaming",
    "gamer",
    "videogame",
    "videogames",
    "meme",
    "memes",
  ]),
  categoryTokens: FRANCHISE_POP_PRIORITY.categoryTokens,
};

/** Distinct Smart Profile / copy dimensions that must agree for Pop→Music override. */
const MUSIC_OVERRIDE_MIN_DIMENSIONS = 2;

/**
 * Cute / whimsical aesthetic evidence for Cute & Whimsical (fallback boost + exact-match challenge).
 * Category matching uses the category **name** only — reciprocal Animals descriptions mention cute/whimsical.
 */
const CUTE_WHIMSICAL_PRIORITY: PriorityFamily = {
  signalTokens: new Set([
    "cute",
    "adorable",
    "whimsical",
    "whimsy",
    "playful",
    "charming",
    "quirky",
    "storybook",
    "childlike",
    "fanciful",
    "sweet",
    "silly",
  ]),
  categoryTokens: new Set(["cute", "whimsical", "whimsy"]),
};

/**
 * Exact approved categories that must not be overturned by the generalized structured-evidence
 * challenge (domain / life-role / commercial-intent families). Broad subject buckets like Animals
 * remain challengeable.
 */
const PROTECTED_DOMAIN_CATEGORY_NAME_TOKENS = new Set([
  "faith",
  "worship",
  "inspirational",
  "affirmations",
  "music",
  "band",
  "bands",
  "occupation",
  "occupations",
  "school",
  "education",
  "teacher",
  "holiday",
  "seasonal",
  "family",
  "sport",
  "sports",
  "cannabis",
  "astrology",
  "zodiac",
  "funny",
  "sarcastic",
  "patriotic",
  "americana",
  "awareness",
  "causes",
  "western",
  "country",
]);

/** Challenger must beat exact score by at least one priority boost (material margin). */
const STRUCTURED_CHALLENGE_MIN_MARGIN = PRIORITY_BOOST_WEIGHT;

/** Independent Smart Profile / copy dimensions that must support the challenger. */
const STRUCTURED_CHALLENGE_MIN_DIMENSIONS = 2;

const PRIORITY_FAMILIES: readonly PriorityFamily[] = [
  FAMILY_PRIORITY,
  FAITH_PRIORITY,
  TEACHER_PRIORITY,
  HUMOR_PRIORITY,
  CANNABIS_PRIORITY,
  ASTROLOGY_PRIORITY,
  FRANCHISE_POP_PRIORITY,
  MUSIC_PRIORITY,
  CUTE_WHIMSICAL_PRIORITY,
];

/**
 * Generic art-style-only tokens that must not, by themselves, push a design toward a
 * pop-culture/character category. They only count toward such a category when a genuine
 * character/franchise/brand-name signal is also present (handled naturally: these tokens are
 * simply excluded from scoring against pop-culture/character categories, so a real character name
 * like "wednesday" or "mario" still scores normally there).
 */
const STYLE_ONLY_TOKENS = new Set([
  "skeleton",
  "skeletons",
  "skull",
  "skulls",
  "cartoon",
  "mascot",
  "illustrated",
  "illustration",
  "character",
  "characters",
]);

const POP_CULTURE_CATEGORY_TOKENS = new Set(["pop", "culture", "character", "characters"]);

/** A bare "quote" signal must not by itself push toward a humor/quotes category. */
const HUMOR_SIGNAL_TOKENS = new Set([
  "funny",
  "humor",
  "humorous",
  "joke",
  "jokes",
  "comedy",
  "comedic",
  "sarcastic",
  "sarcasm",
]);
const QUOTE_ONLY_TOKENS = new Set(["quote", "quotes", "saying", "sayings"]);
const HUMOR_CATEGORY_TOKENS = new Set(["humor", "humorous", "funny", "comedy", "sarcastic", "sarcasm"]);
const CANNABIS_CATEGORY_TOKENS = new Set(["cannabis", "marijuana", "weed", "420", "stoner"]);
const ASTROLOGY_CATEGORY_TOKENS = new Set(["zodiac", "astrology", "horoscope", "celestial", "astro"]);

/**
 * Joke-structure tokens looked for in themes / interests / searchConcepts (and as structure
 * markers). Includes pun/joke plus core humor lexical — not design-specific words.
 */
const JOKE_STRUCTURE_PROFILE_TOKENS = new Set([
  "pun",
  "puns",
  "joke",
  "jokes",
  "funny",
  "humor",
  "humorous",
  "comedy",
  "comedic",
  "sarcastic",
  "sarcasm",
  "snark",
  "witty",
  "attitude",
]);

function categoryTokenSet(categoryName: string, categoryDescription: string | undefined): Set<string> {
  return new Set([...tokenize(categoryName), ...tokenize(categoryDescription)]);
}

function isPopCultureCategory(categoryTokens: ReadonlySet<string>): boolean {
  return [...POP_CULTURE_CATEGORY_TOKENS].some((token) => categoryTokens.has(token));
}

function isHumorCategory(categoryTokens: ReadonlySet<string>): boolean {
  return [...HUMOR_CATEGORY_TOKENS].some((token) => categoryTokens.has(token));
}

function isCannabisCategory(categoryTokens: ReadonlySet<string>): boolean {
  return [...CANNABIS_CATEGORY_TOKENS].some((token) => categoryTokens.has(token));
}

function isAstrologyCategory(categoryTokens: ReadonlySet<string>): boolean {
  return [...ASTROLOGY_CATEGORY_TOKENS].some((token) => categoryTokens.has(token));
}

/** Music category detection uses the category **name** only — Pop descriptions mention Music & Bands. */
function isMusicCategoryByName(categoryName: string): boolean {
  const nameTokens = categoryTokenSet(categoryName, undefined);
  return [...MUSIC_PRIORITY.categoryTokens].some((token) => nameTokens.has(token));
}

function findBestApprovedMusicCategory(
  approvedCategories: readonly { id: string; name: string; description?: string }[],
  signalTokens: readonly string[],
  signalTokenSet: ReadonlySet<string>,
): { id: string; name: string } | undefined {
  let best: { id: string; name: string } | undefined;
  let bestScore = -1;

  for (const category of approvedCategories) {
    if (!isMusicCategoryByName(category.name)) {
      continue;
    }
    const score = scoreCategory(category.name, category.description, signalTokens, signalTokenSet);
    if (score > bestScore) {
      bestScore = score;
      best = { id: category.id, name: category.name };
    }
  }

  return best;
}

function countFamilySignalHits(
  family: PriorityFamily,
  signalTokenSet: ReadonlySet<string>,
): number {
  let hits = 0;
  for (const token of family.signalTokens) {
    if (signalTokenSet.has(token)) {
      hits += 1;
    }
  }
  return hits;
}

function findBestApprovedCategoryForFamily(
  family: PriorityFamily,
  approvedCategories: readonly { id: string; name: string; description?: string }[],
  match: (categoryTokens: ReadonlySet<string>) => boolean,
  signalTokens: readonly string[],
  signalTokenSet: ReadonlySet<string>,
): { id: string; name: string } | undefined {
  let best: { id: string; name: string } | undefined;
  let bestScore = -1;

  for (const category of approvedCategories) {
    const tokens = categoryTokenSet(category.name, category.description);
    if (!match(tokens)) {
      continue;
    }
    if (![...family.categoryTokens].some((token) => tokens.has(token))) {
      continue;
    }
    const score = scoreCategory(category.name, category.description, signalTokens, signalTokenSet);
    if (score > bestScore) {
      bestScore = score;
      best = { id: category.id, name: category.name };
    }
  }

  return best;
}

function scoreCategory(
  categoryName: string,
  categoryDescription: string | undefined,
  signalTokens: readonly string[],
  signalTokenSet: ReadonlySet<string>,
): number {
  const categoryTokens = categoryTokenSet(categoryName, categoryDescription);
  let score = 0;
  const categoryIsPopCulture = isPopCultureCategory(categoryTokens);
  const categoryIsHumor = isHumorCategory(categoryTokens);
  const hasHumorSignal = [...HUMOR_SIGNAL_TOKENS].some((token) => signalTokenSet.has(token));
  const familyHits = countFamilySignalHits(FAMILY_PRIORITY, signalTokenSet);
  const faithHits = countFamilySignalHits(FAITH_PRIORITY, signalTokenSet);
  const teacherHits = countFamilySignalHits(TEACHER_PRIORITY, signalTokenSet);
  const familyStrongSingleton = ["motherhood", "fatherhood", "parenting", "mother", "father", "mom", "dad"].some(
    (token) => signalTokenSet.has(token),
  );
  const lifeRoleDominant =
    familyStrongSingleton ||
    familyHits >= DOMINANT_OVERRIDE_MIN_SIGNAL_HITS ||
    faithHits >= DOMINANT_OVERRIDE_MIN_SIGNAL_HITS ||
    teacherHits >= DOMINANT_OVERRIDE_MIN_SIGNAL_HITS;

  for (const token of signalTokens) {
    if (!categoryTokens.has(token)) {
      continue;
    }

    // Style-only tokens (skeleton, cartoon, etc.) never contribute score toward a pop-culture /
    // character category on their own — only a genuine character/franchise name does.
    if (categoryIsPopCulture && STYLE_ONLY_TOKENS.has(token)) {
      continue;
    }

    // A bare "quote" token never contributes score toward a humor/quotes category unless a
    // separate humor/funny/joke signal is also present among the tokens.
    if (categoryIsHumor && QUOTE_ONLY_TOKENS.has(token) && !hasHumorSignal) {
      continue;
    }

    score += TOKEN_OVERLAP_WEIGHT;
  }

  for (const family of PRIORITY_FAMILIES) {
    // Preserve Family/Faith/Teacher goldens: incidental funny tags must not outrank life-role themes.
    if (family === HUMOR_PRIORITY && lifeRoleDominant) {
      continue;
    }

    const hasSignal = signalTokens.some((token) => family.signalTokens.has(token));
    // Music / Cute: match priority on category **name** only — reciprocal descriptions name the peer category.
    const categoryMatchesFamily =
      family === MUSIC_PRIORITY || family === CUTE_WHIMSICAL_PRIORITY
        ? [...family.categoryTokens].some((token) => categoryTokenSet(categoryName, undefined).has(token))
        : [...family.categoryTokens].some((token) => categoryTokens.has(token));

    if (hasSignal && categoryMatchesFamily) {
      score += PRIORITY_BOOST_WEIGHT;
    }
  }

  return score;
}

/**
 * Find an approved category whose name matches the raw model candidate exactly, tolerant of
 * casing and punctuation differences (the same normalization used for tag alias matching). The
 * v20 prompt shows the model the approved category name list directly, so an exact match here
 * is strong evidence — but not automatically final when a stronger dominant-intent family wins.
 */
function findExactCategoryNameMatch(
  rawCategory: string | undefined,
  approvedCategories: readonly { id: string; name: string; description?: string }[],
): { id: string; name: string } | undefined {
  if (!rawCategory?.trim()) {
    return undefined;
  }

  const normalizedCandidate = normalizeForAliasMatch(rawCategory);

  if (!normalizedCandidate) {
    return undefined;
  }

  return approvedCategories.find(
    (category) => normalizeForAliasMatch(category.name) === normalizedCandidate,
  );
}

function flattenPhraseList(values: readonly string[] | undefined): string[] {
  if (!values?.length) {
    return [];
  }
  return values.flatMap((phrase) => tokenize(phrase));
}

function buildSignalTokens(input: ResolveThemeCategoryInput): {
  signalTokens: string[];
  signalTokenSet: Set<string>;
} {
  const signalTokens = [
    ...tokenize(input.rawCategory),
    ...tokenize(input.title),
    ...tokenize(input.description),
    ...(input.visibleText ?? []).flatMap((phrase) => tokenize(phrase)),
    ...input.matchedTags.flatMap((tag) => tokenize(tag)),
    ...flattenPhraseList(input.subjects),
    ...flattenPhraseList(input.objects),
    ...flattenPhraseList(input.styles),
    ...flattenPhraseList(input.themes),
    ...flattenPhraseList(input.interests),
    ...flattenPhraseList(input.professionsGroups),
    ...flattenPhraseList(input.searchConcepts),
  ];
  return { signalTokens, signalTokenSet: new Set(signalTokens) };
}

/**
 * Durable structured-evidence bag — intentionally excludes matchedTags so exact-match challenge
 * and Music-vs-Pop remain valid after legacy tag retirement.
 */
function buildDurableStructuredEvidenceTokens(input: ResolveThemeCategoryInput): string[] {
  return [
    ...tokenize(input.title),
    ...tokenize(input.description),
    ...(input.visibleText ?? []).flatMap((phrase) => tokenize(phrase)),
    ...flattenPhraseList(input.subjects),
    ...flattenPhraseList(input.objects),
    ...flattenPhraseList(input.styles),
    ...flattenPhraseList(input.themes),
    ...flattenPhraseList(input.interests),
    ...flattenPhraseList(input.professionsGroups),
    ...flattenPhraseList(input.searchConcepts),
  ];
}

/**
 * Durable Music-vs-Pop evidence bag — intentionally excludes matchedTags so the override
 * remains valid after legacy tag retirement.
 */
function buildDurableMusicEvidenceTokenSet(input: ResolveThemeCategoryInput): Set<string> {
  return new Set(buildDurableStructuredEvidenceTokens(input));
}

function dimensionHasMusicSignal(phrases: readonly string[] | undefined): boolean {
  if (!phrases?.length) {
    return false;
  }
  const tokens = new Set(flattenPhraseList(phrases));
  return countFamilySignalHits(MUSIC_PRIORITY, tokens) >= 1;
}

function countMusicEvidenceDimensions(input: ResolveThemeCategoryInput): number {
  const copyBag = [
    ...(input.visibleText ?? []),
    ...(input.title ? [input.title] : []),
    ...(input.description ? [input.description] : []),
  ];
  let dimensions = 0;
  if (dimensionHasMusicSignal(input.themes)) {
    dimensions += 1;
  }
  if (dimensionHasMusicSignal(input.interests)) {
    dimensions += 1;
  }
  if (dimensionHasMusicSignal(input.searchConcepts)) {
    dimensions += 1;
  }
  if (dimensionHasMusicSignal(input.professionsGroups)) {
    dimensions += 1;
  }
  if (dimensionHasMusicSignal(copyBag)) {
    dimensions += 1;
  }
  return dimensions;
}

function hasMusicIdentityCue(durableTokens: ReadonlySet<string>): boolean {
  return [...MUSIC_IDENTITY_TOKENS].some((token) => durableTokens.has(token));
}

/**
 * Pop→Music exact-match override: multi-dimension music agreement + identity cue,
 * blocked by faith/life-role dominance or strong non-music Pop media/franchise signals.
 * Music detection uses durable Smart Profile / copy fields only (not matchedTags).
 */
function isMusicDominantOverPop(input: ResolveThemeCategoryInput): boolean {
  const durableTokens = buildDurableMusicEvidenceTokenSet(input);
  const lifeRoleBag = new Set([
    ...durableTokens,
    ...input.matchedTags.flatMap((tag) => tokenize(tag)),
  ]);
  if (isLifeRoleDominant(lifeRoleBag)) {
    return false;
  }

  const musicHits = countFamilySignalHits(MUSIC_PRIORITY, durableTokens);
  if (musicHits < DOMINANT_OVERRIDE_MIN_SIGNAL_HITS) {
    return false;
  }
  if (countMusicEvidenceDimensions(input) < MUSIC_OVERRIDE_MIN_DIMENSIONS) {
    return false;
  }
  if (!hasMusicIdentityCue(durableTokens)) {
    return false;
  }

  const mediaHits = countFamilySignalHits(POP_MEDIA_BLOCK_FOR_MUSIC, durableTokens);
  if (mediaHits >= DOMINANT_OVERRIDE_MIN_SIGNAL_HITS) {
    return false;
  }

  return true;
}

function countHumorLexicalHits(signalTokenSet: ReadonlySet<string>): number {
  return countFamilySignalHits(HUMOR_PRIORITY, signalTokenSet);
}

function profileDimensionTokenSet(input: ResolveThemeCategoryInput): Set<string> {
  return new Set([
    ...flattenPhraseList(input.styles),
    ...flattenPhraseList(input.themes),
    ...flattenPhraseList(input.interests),
    ...flattenPhraseList(input.professionsGroups),
    ...flattenPhraseList(input.searchConcepts),
  ]);
}

function matchedTagHumorHits(input: ResolveThemeCategoryInput): number {
  const tagTokens = new Set(input.matchedTags.flatMap((tag) => tokenize(tag)));
  return countFamilySignalHits(HUMOR_PRIORITY, tagTokens);
}

function nonVisibleTextHumorHits(input: ResolveThemeCategoryInput): number {
  const tokens = new Set([
    ...tokenize(input.rawCategory),
    ...tokenize(input.title),
    ...tokenize(input.description),
    ...input.matchedTags.flatMap((tag) => tokenize(tag)),
    ...flattenPhraseList(input.subjects),
    ...flattenPhraseList(input.objects),
    ...flattenPhraseList(input.styles),
    ...flattenPhraseList(input.themes),
    ...flattenPhraseList(input.interests),
    ...flattenPhraseList(input.professionsGroups),
    ...flattenPhraseList(input.searchConcepts),
  ]);
  return countHumorLexicalHits(tokens);
}

function hasShortSloganVisibleText(input: ResolveThemeCategoryInput): boolean {
  const lines = input.visibleText ?? [];
  if (lines.length === 0 || lines.length > 3) {
    return false;
  }
  return lines.every((line) => {
    const tokens = tokenize(line);
    return tokens.length > 0 && tokens.length <= SHORT_SLOGAN_VISIBLE_TEXT_MAX_TOKENS;
  });
}

/**
 * General joke-structure evidence. Short visibleText slogans alone are never enough.
 */
function hasJokeStructureEvidence(input: ResolveThemeCategoryInput): boolean {
  const profileTokens = profileDimensionTokenSet(input);
  if ([...JOKE_STRUCTURE_PROFILE_TOKENS].some((token) => profileTokens.has(token))) {
    return true;
  }
  if (matchedTagHumorHits(input) >= JOKE_PRIMARY_LEXICAL_WITH_STRUCTURE) {
    return true;
  }
  if (hasShortSloganVisibleText(input) && nonVisibleTextHumorHits(input) >= 1) {
    return true;
  }
  return false;
}

function isJokePrimary(input: ResolveThemeCategoryInput, signalTokenSet: ReadonlySet<string>): boolean {
  const humorLexicalHits = countHumorLexicalHits(signalTokenSet);
  if (humorLexicalHits >= JOKE_PRIMARY_LEXICAL_ALONE) {
    return true;
  }
  if (humorLexicalHits >= JOKE_PRIMARY_LEXICAL_WITH_STRUCTURE && hasJokeStructureEvidence(input)) {
    return true;
  }
  return false;
}

function isLifeRoleDominant(signalTokenSet: ReadonlySet<string>): boolean {
  const familyHits = countFamilySignalHits(FAMILY_PRIORITY, signalTokenSet);
  const faithHits = countFamilySignalHits(FAITH_PRIORITY, signalTokenSet);
  const teacherHits = countFamilySignalHits(TEACHER_PRIORITY, signalTokenSet);
  const familyStrongSingleton = ["motherhood", "fatherhood", "parenting", "mother", "father", "mom", "dad"].some(
    (token) => signalTokenSet.has(token),
  );
  return (
    familyStrongSingleton ||
    familyHits >= DOMINANT_OVERRIDE_MIN_SIGNAL_HITS ||
    faithHits >= DOMINANT_OVERRIDE_MIN_SIGNAL_HITS ||
    teacherHits >= DOMINANT_OVERRIDE_MIN_SIGNAL_HITS
  );
}

/**
 * Thresholded dominant-intent second-pass over an exact model category match.
 * Exact match remains the default; override only for general owner-intent families.
 * Humor override is joke-primary dual-gate — not Animals-gated.
 */
function isProtectedDomainExactCategory(categoryName: string): boolean {
  const nameTokens = categoryTokenSet(categoryName, undefined);
  return [...PROTECTED_DOMAIN_CATEGORY_NAME_TOKENS].some((token) => nameTokens.has(token));
}

function isCuteWhimsicalCategoryByName(categoryName: string): boolean {
  const nameTokens = categoryTokenSet(categoryName, undefined);
  return [...CUTE_WHIMSICAL_PRIORITY.categoryTokens].some((token) => nameTokens.has(token));
}

/**
 * Count independent dimensions that support the challenger.
 * Cute-named challengers use aesthetic family signals; others use challenger name tokens.
 */
function countChallengerSupportDimensions(
  input: ResolveThemeCategoryInput,
  challengerName: string,
): number {
  const nameTokens = categoryTokenSet(challengerName, undefined);
  const supportTokens = isCuteWhimsicalCategoryByName(challengerName)
    ? CUTE_WHIMSICAL_PRIORITY.signalTokens
    : nameTokens;

  const dimensions: Array<readonly string[] | undefined> = [
    input.styles,
    input.themes,
    input.searchConcepts,
    input.interests,
    input.subjects,
    input.objects,
    input.professionsGroups,
    [
      ...(input.visibleText ?? []),
      ...(input.title ? [input.title] : []),
      ...(input.description ? [input.description] : []),
    ],
  ];

  let count = 0;
  for (const dimension of dimensions) {
    if (!dimension?.length) {
      continue;
    }
    const tokens = new Set(flattenPhraseList(dimension));
    if ([...supportTokens].some((token) => tokens.has(token))) {
      count += 1;
    }
  }
  return count;
}

/**
 * Generalized exact-match challenge: reuse name-primary scoring (avoids reciprocal description
 * pollution) on durable Smart Profile evidence. Override only when a challenger wins by a
 * material margin with multi-dimension support. Protected domain exact matches are never challenged.
 * Does not require matchedTags.
 */
function challengeExactMatchWithStructuredEvidence(
  exactMatch: { id: string; name: string },
  input: ResolveThemeCategoryInput,
): { id: string; name: string } | undefined {
  if (isProtectedDomainExactCategory(exactMatch.name)) {
    return undefined;
  }

  const durableTokens = buildDurableStructuredEvidenceTokens(input);
  const durableTokenSet = new Set(durableTokens);

  // Name-only scoring avoids reciprocal description tokens (e.g. Animals mentioning cute/whimsical).
  const exactScore = scoreCategory(exactMatch.name, undefined, durableTokens, durableTokenSet);

  let best: { id: string; name: string } | undefined;
  let bestScore = -1;

  for (const category of input.approvedCategories) {
    if (category.id === exactMatch.id) {
      continue;
    }
    const score = scoreCategory(category.name, undefined, durableTokens, durableTokenSet);
    if (score > bestScore) {
      bestScore = score;
      best = { id: category.id, name: category.name };
    }
  }

  if (!best || bestScore < MIN_RESOLVE_SCORE) {
    return undefined;
  }
  if (bestScore < exactScore + STRUCTURED_CHALLENGE_MIN_MARGIN) {
    return undefined;
  }
  if (countChallengerSupportDimensions(input, best.name) < STRUCTURED_CHALLENGE_MIN_DIMENSIONS) {
    return undefined;
  }

  return best;
}

function resolveExactMatchWithDominantIntentOverride(
  exactMatch: { id: string; name: string },
  input: ResolveThemeCategoryInput,
  signalTokens: readonly string[],
  signalTokenSet: ReadonlySet<string>,
): { id: string; name: string } {
  const exactTokens = categoryTokenSet(
    exactMatch.name,
    input.approvedCategories.find((category) => category.id === exactMatch.id)?.description,
  );

  const cannabisHits = countFamilySignalHits(CANNABIS_PRIORITY, signalTokenSet);
  if (cannabisHits >= DOMINANT_OVERRIDE_MIN_SIGNAL_HITS && isHumorCategory(exactTokens)) {
    const cannabisCategory = findBestApprovedCategoryForFamily(
      CANNABIS_PRIORITY,
      input.approvedCategories,
      isCannabisCategory,
      signalTokens,
      signalTokenSet,
    );
    if (cannabisCategory) {
      return cannabisCategory;
    }
  }

  const astrologyHits = countFamilySignalHits(ASTROLOGY_PRIORITY, signalTokenSet);
  const franchiseHits = countFamilySignalHits(FRANCHISE_POP_PRIORITY, signalTokenSet);
  if (
    astrologyHits >= DOMINANT_OVERRIDE_MIN_SIGNAL_HITS &&
    isPopCultureCategory(exactTokens) &&
    franchiseHits < DOMINANT_OVERRIDE_MIN_SIGNAL_HITS
  ) {
    const astrologyCategory = findBestApprovedCategoryForFamily(
      ASTROLOGY_PRIORITY,
      input.approvedCategories,
      isAstrologyCategory,
      signalTokens,
      signalTokenSet,
    );
    if (astrologyCategory) {
      return astrologyCategory;
    }
  }

  // Joke-primary may override ANY non-humor exact match (Animals, Food & Drink, etc.).
  if (
    !isHumorCategory(exactTokens) &&
    !isLifeRoleDominant(signalTokenSet) &&
    cannabisHits < DOMINANT_OVERRIDE_MIN_SIGNAL_HITS &&
    isJokePrimary(input, signalTokenSet)
  ) {
    const humorCategory = findBestApprovedCategoryForFamily(
      HUMOR_PRIORITY,
      input.approvedCategories,
      isHumorCategory,
      signalTokens,
      signalTokenSet,
    );
    if (humorCategory) {
      return humorCategory;
    }
  }

  // Music-vs-Pop: exact Pop Culture only; multi-dimension durable music evidence; no artist hardcodes.
  if (isPopCultureCategory(exactTokens) && isMusicDominantOverPop(input)) {
    const musicCategory = findBestApprovedMusicCategory(
      input.approvedCategories,
      signalTokens,
      signalTokenSet,
    );
    if (musicCategory) {
      return musicCategory;
    }
  }

  // Generalized structured-evidence challenge (e.g. Animals exact → Cute & Whimsical when aesthetic
  // dominates). Runs after family-specific overrides; never requires matchedTags.
  const challenged = challengeExactMatchWithStructuredEvidence(exactMatch, input);
  if (challenged) {
    return challenged;
  }

  return exactMatch;
}

/**
 * Deterministic, pure server-side category resolver for the lean-plus-category-names prompt.
 * Exact approved-name matches are strong evidence. A thresholded dominant-intent second-pass may
 * replace exact match for general commercial-intent families (joke-primary humor over any non-humor
 * exact; cannabis>humor; astrology>generic pop; music>generic pop) and a bounded structured-evidence
 * challenge may replace non-protected exact matches when another approved category scores materially
 * higher on durable Smart Profile evidence (styles/themes/subjects/…). No per-design hardcodes.
 * Signal bag includes enrichment-parse themes/subjects/objects/styles/interests/professionsGroups/
 * searchConcepts when provided. Otherwise token-overlap + priority-family scoring selects among
 * approved categories.
 * Returns {} when there is no exact match and no approved category clears the minimum fallback
 * score — callers must leave categoryName/categoryId undefined in that case (never fall back to
 * the raw candidate string itself).
 */
export function resolveThemeCategory(
  input: ResolveThemeCategoryInput,
  categoryIdsByName: Record<string, string>,
): ResolveThemeCategoryResult {
  const { signalTokens, signalTokenSet } = buildSignalTokens(input);
  const exactMatch = findExactCategoryNameMatch(input.rawCategory, input.approvedCategories);

  if (exactMatch) {
    const resolved = resolveExactMatchWithDominantIntentOverride(
      exactMatch,
      input,
      signalTokens,
      signalTokenSet,
    );
    return { categoryId: resolved.id, categoryName: resolved.name };
  }

  let bestName: string | undefined;
  let bestScore = 0;

  for (const category of input.approvedCategories) {
    const score = scoreCategory(category.name, category.description, signalTokens, signalTokenSet);

    if (score > bestScore) {
      bestScore = score;
      bestName = category.name;
    }
  }

  if (!bestName || bestScore < MIN_RESOLVE_SCORE) {
    return {};
  }

  return {
    categoryName: bestName,
    categoryId: categoryIdsByName[bestName.toLowerCase()],
  };
}
