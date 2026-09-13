/**
 * AI-only subject canonicalization (normalizer-v5).
 *
 * Grammatical / structural classes — not a curated subject synonym table.
 * Do not run on staff-edit or import-preset dimension normalization.
 */

export type SubjectModifierClass = "derivative" | "bound" | "type" | "other";

function foldToken(word: string): string {
  return word.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function splitSubjectWords(value: string): string[] {
  return value.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

/** Color / ink words — belong in `colors`, not as subject prefixes. */
const COLOR_MODIFIERS = new Set([
  "white",
  "black",
  "brown",
  "green",
  "blue",
  "pink",
  "red",
  "yellow",
  "orange",
  "purple",
  "gray",
  "grey",
  "gold",
  "silver",
]);

/** Style / mood words — belong in styles/themes, not as subject prefixes. */
const STYLE_MOOD_MODIFIERS = new Set([
  "vintage",
  "retro",
  "watercolor",
  "floral",
  "cartoon",
  "sparkly",
  "distressed",
  "spooky",
  "cute",
  "funny",
  "whimsical",
  "expressive",
  "animated",
  "plaid",
  "checkered",
  "soft",
  "fuzzy",
  "large",
  "small",
  "wide",
  "wideeyed",
  "tired",
  "smiling",
  "happy",
  "sad",
  "angry",
]);

/** Action / pose participles and depict-verbs — not identity. */
const ACTION_POSE_MODIFIERS = new Set([
  "leaping",
  "jumping",
  "running",
  "dancing",
  "swimming",
  "flying",
  "walking",
  "sleeping",
  "sitting",
  "standing",
  "holding",
  "wearing",
  "blooming",
  "laughing",
  "smiling",
  "waving",
  "posing",
  "looking",
  "eating",
  "drinking",
  "fishing",
]);

/** Slogan / function-word glue — not identity and not species. */
const GLUE_MODIFIERS = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "into",
  "onto",
  "over",
  "under",
  "its",
  "his",
  "her",
  "their",
  "this",
  "that",
  "these",
  "those",
  "problem",
  "bath",
  "hotter",
  "than",
  "like",
  "sounds",
  "husband",
  "husbands",
  "wife",
  "toaster",
  "peace",
  "love",
  "just",
  "hit",
  "silhouette",
  "coochie",
  "hoochie",
  "featuring",
  "features",
  "including",
  "includes",
  "showing",
  "shows",
  "depicting",
  "illustration",
  "image",
  "design",
  "artwork",
  "photo",
  "friends",
  "group",
]);
const LIGHT_VERBS = new Set([
  "make",
  "made",
  "hold",
  "come",
  "get",
  "let",
  "take",
  "keep",
  "put",
  "give",
  "want",
  "need",
  "love",
  "like",
  "watch",
  "see",
  "look",
  "hit",
  "live",
  "laugh",
  "just",
]);

/**
 * Attributive first tokens that do not name the entity alone.
 * Keeps atomic compounds such as highland cow / sea turtle / fire truck.
 */
const BOUND_COMPOUND_MODIFIERS = new Set([
  "highland",
  "miniature",
  "sea",
  "air",
  "fire",
  "police",
  "ice",
  "christmas",
  "hot",
  "electric",
  "polar",
  "saint",
  "st",
  "french",
  "german",
  "american",
  "english",
  "swiss",
  "siamese",
  "great",
  "golden",
  "largemouth",
  "teddy",
  "frankenstein",
  "frankensteins",
]);

function isLikelyIngAction(folded: string): boolean {
  if (folded.length < 6 || !folded.endsWith("ing")) {
    return false;
  }
  if (BOUND_COMPOUND_MODIFIERS.has(folded)) {
    return false;
  }
  return true;
}

export function classifySubjectModifier(word: string): SubjectModifierClass {
  const raw = word.trim().toLowerCase();
  if (!raw) {
    return "other";
  }
  if (raw.includes("-")) {
    return "other";
  }
  const folded = foldToken(raw);
  if (!folded) {
    return "other";
  }
  if (BOUND_COMPOUND_MODIFIERS.has(folded)) {
    return "bound";
  }
  if (
    COLOR_MODIFIERS.has(folded) ||
    STYLE_MOOD_MODIFIERS.has(folded) ||
    ACTION_POSE_MODIFIERS.has(folded) ||
    LIGHT_VERBS.has(folded) ||
    GLUE_MODIFIERS.has(folded) ||
    isLikelyIngAction(folded)
  ) {
    return "derivative";
  }
  if (folded.length < 4 || folded.includes("-")) {
    return "other";
  }
  return "type";
}

/** Gate I promote: only bound identity compounds, never action/color/type-restatement. */
export function isPromotableSpecificityModifier(word: string): boolean {
  return classifySubjectModifier(word) === "bound";
}

function phraseContiguousInVisibleText(
  phrase: string,
  visibleText: readonly string[] | undefined,
): boolean {
  const phraseWords = splitSubjectWords(phrase);
  if (phraseWords.length < 2) {
    return false;
  }
  for (const line of visibleText ?? []) {
    const lineWords = splitSubjectWords(line.replace(/[^a-z0-9\s]+/gi, " "));
    if (lineWords.length < phraseWords.length) {
      continue;
    }
    for (let index = 0; index <= lineWords.length - phraseWords.length; index += 1) {
      if (lineWords.slice(index, index + phraseWords.length).join(" ") === phraseWords.join(" ")) {
        return true;
      }
    }
  }
  return false;
}

function subjectKey(value: string): string {
  return value.trim().toLowerCase();
}

function ensureToken(list: string[], token: string, seen: Set<string>): void {
  const trimmed = token.trim();
  if (!trimmed) {
    return;
  }
  const key = subjectKey(trimmed);
  if (seen.has(key)) {
    return;
  }
  seen.add(key);
  list.push(trimmed);
}

export interface CollapseRedundantSubjectDerivativesInput {
  subjects?: readonly string[];
  searchConcepts?: readonly string[];
  visibleText?: readonly string[];
}

export interface CollapseRedundantSubjectDerivativesResult {
  subjects?: string[];
  searchConcepts?: string[];
}

/**
 * Collapse redundant AI subject phrases to reusable bases.
 * Relocates standalone type tokens into searchConcepts only when they already
 * appeared as a subject modifier (does not invent new concepts).
 */
export function collapseRedundantSubjectDerivatives(
  input: CollapseRedundantSubjectDerivativesInput,
): CollapseRedundantSubjectDerivativesResult {
  const original = (input.subjects ?? []).map((s) => s.trim()).filter(Boolean);
  if (original.length === 0) {
    return {
      subjects: undefined,
      searchConcepts: input.searchConcepts ? [...input.searchConcepts] : undefined,
    };
  }

  const originalLower = original.map((s) => s.toLowerCase());

  const isRedundantCharacterMerge = (modifier: string, head: string, phrase: string): boolean => {
    const headStandalone = originalLower.some((other) => other === head);
    const modifierAnchorsOtherIdentity = originalLower.some((other) => {
      if (other === phrase.toLowerCase()) {
        return false;
      }
      const otherWords = other.split(/\s+/).filter(Boolean);
      return otherWords.length >= 2 && otherWords[0] === modifier;
    });
    return headStandalone && modifierAnchorsOtherIdentity;
  };

  const searchConcepts = [...(input.searchConcepts ?? [])];
  const searchSeen = new Set(searchConcepts.map((item) => subjectKey(item)));

  const relocateTypeToken = (token: string) => {
    const trimmed = token.trim();
    if (!trimmed || searchSeen.has(subjectKey(trimmed))) {
      return;
    }
    searchSeen.add(subjectKey(trimmed));
    searchConcepts.push(trimmed);
  };

  const kept: string[] = [];
  const seen = new Set<string>();

  const collapsePhrase = (subject: string): void => {
    const words = splitSubjectWords(subject);
    if (words.length === 0) {
      return;
    }
    if (words.length === 1) {
      ensureToken(kept, subject, seen);
      return;
    }

    const firstClass = classifySubjectModifier(words[0]!);
    const inVisibleText = phraseContiguousInVisibleText(subject, input.visibleText);

    if (words.length >= 3) {
      if (firstClass === "derivative") {
        collapsePhrase(words.slice(1).join(" "));
        return;
      }
      ensureToken(kept, subject, seen);
      ensureToken(kept, words[words.length - 1]!, seen);
      return;
    }

    const modifier = words[0]!;
    const head = words[1]!;
    const modifierClass = firstClass;

    if (isRedundantCharacterMerge(modifier, head, subject)) {
      ensureToken(kept, subject, seen);
      return;
    }

    if (inVisibleText && (modifierClass === "derivative" || LIGHT_VERBS.has(foldToken(modifier)))) {
      ensureToken(kept, head, seen);
      return;
    }

    if (modifierClass === "derivative") {
      ensureToken(kept, head, seen);
      return;
    }

    if (modifierClass === "bound") {
      ensureToken(kept, subject, seen);
      ensureToken(kept, head, seen);
      return;
    }

    if (modifierClass === "type") {
      ensureToken(kept, head, seen);
      ensureToken(kept, modifier, seen);
      relocateTypeToken(modifier);
      return;
    }

    ensureToken(kept, subject, seen);
  };

  for (const subject of original) {
    collapsePhrase(subject);
  }

  return {
    subjects: kept.length > 0 ? kept : undefined,
    searchConcepts: searchConcepts.length > 0 ? searchConcepts : undefined,
  };
}
