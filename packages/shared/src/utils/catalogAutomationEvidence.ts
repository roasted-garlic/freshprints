/**
 * Evidence helpers for Catalog Automation — contextual consistency checks.
 * Do NOT use a global semantic denylist for ordinary concepts (people, animal, etc.).
 */

export interface StructuredEvidenceGap {
  dimension: "subjects" | "objects";
  token: string;
  reasonCode: string;
}

function normalizeEvidenceCorpus(parts: Array<string | undefined | null>): string {
  return parts
    .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
    .join(" ")
    .toLowerCase();
}

function tokenizeEvidenceWords(value: string | undefined | null): string[] {
  if (!value?.trim()) {
    return [];
  }
  return value
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.replace(/[^a-z0-9-]+/gi, ""))
    .filter((w) => w.length > 2);
}

function corpusIncludesPhrase(corpus: string, phrase: string): boolean {
  const normalized = phrase.trim().toLowerCase();
  if (!normalized) {
    return true;
  }
  if (corpus.includes(normalized)) {
    return true;
  }
  // Plural/singular light heuristic (token and irregular -y/-ies)
  if (normalized.endsWith("s") && corpus.includes(normalized.slice(0, -1))) {
    return true;
  }
  if (!normalized.endsWith("s") && corpus.includes(`${normalized}s`)) {
    return true;
  }
  if (normalized.endsWith("ies") && corpus.includes(`${normalized.slice(0, -3)}y`)) {
    return true;
  }
  if (normalized.endsWith("y") && corpus.includes(`${normalized.slice(0, -1)}ies`)) {
    return true;
  }
  return false;
}

function tokenHasLexicalSupport(token: string, corpus: string): boolean {
  return corpusIncludesPhrase(corpus, token);
}

/**
 * Multi-word subjects must not self-validate solely via title glue
 * (slogan + appended centralSubject). Independent support = description,
 * centralSubject, visibleText, or a short identity-style title where the
 * phrase is an early contiguous identity (Highland-style), not a late slogan tail.
 */
export function multiWordSubjectHasIndependentSupport(input: {
  token: string;
  title?: string;
  description?: string;
  centralSubject?: string;
  visibleText?: string[];
}): boolean {
  const token = input.token.trim().toLowerCase();
  if (!token.includes(" ")) {
    return true;
  }

  const independentCorpus = normalizeEvidenceCorpus([
    input.description,
    input.centralSubject,
    ...(input.visibleText ?? []),
  ]);
  if (tokenHasLexicalSupport(token, independentCorpus)) {
    return true;
  }

  const titleWords = tokenizeEvidenceWords(input.title);
  const phraseWords = token.split(/\s+/).filter(Boolean);
  if (phraseWords.length < 2 || titleWords.length === 0) {
    return false;
  }

  // Short identity titles (≤6 content words) may ground the phrase.
  if (titleWords.length <= 6 && titleWords.join(" ").includes(phraseWords.join(" "))) {
    // Reject when the phrase starts after a long slogan prefix (≥3 words before).
    for (let index = 0; index <= titleWords.length - phraseWords.length; index += 1) {
      const slice = titleWords.slice(index, index + phraseWords.length);
      if (slice.join(" ") === phraseWords.join(" ")) {
        return index < 3;
      }
    }
  }

  return false;
}

/**
 * Tokens present in structured subjects/objects with no support in title,
 * description, or visible text. Contextual only — not a denylist.
 */
export function findStructuredEvidenceGaps(input: {
  subjects?: string[];
  objects?: string[];
  title?: string;
  description?: string;
  centralSubject?: string;
  visibleText?: string[];
}): StructuredEvidenceGap[] {
  const fullCorpus = normalizeEvidenceCorpus([
    input.title,
    input.description,
    input.centralSubject,
    ...(input.visibleText ?? []),
  ]);
  const gaps: StructuredEvidenceGap[] = [];

  for (const token of input.subjects ?? []) {
    const normalized = token.trim().toLowerCase();
    if (!normalized) {
      continue;
    }
    if (normalized.includes(" ")) {
      if (
        !multiWordSubjectHasIndependentSupport({
          token: normalized,
          title: input.title,
          description: input.description,
          centralSubject: input.centralSubject,
          visibleText: input.visibleText,
        })
      ) {
        gaps.push({
          dimension: "subjects",
          token,
          reasonCode: `structured_evidence_gap:subjects:${normalized}`,
        });
      }
      continue;
    }
    if (!tokenHasLexicalSupport(normalized, fullCorpus)) {
      gaps.push({
        dimension: "subjects",
        token,
        reasonCode: `structured_evidence_gap:subjects:${normalized}`,
      });
    }
  }

  for (const token of input.objects ?? []) {
    if (!tokenHasLexicalSupport(token, fullCorpus)) {
      gaps.push({
        dimension: "objects",
        token,
        reasonCode: `structured_evidence_gap:objects:${token.trim().toLowerCase()}`,
      });
    }
  }

  return gaps;
}

/**
 * Modifiers that must not form a “specific identity” phrase with a subject head.
 * Keeps promote grounded in breed/type-like tokens (highland cow), not prose glue.
 */
const SPECIFICITY_MODIFIER_BLOCKLIST = new Set([
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
  "cute",
  "funny",
  "fuzzy",
  "brown",
  "soft",
  "large",
  "small",
  "wide",
  "eyed",
  "wide-eyed",
  "cartoon",
  "illustration",
  "image",
  "design",
  "artwork",
  "sitting",
  "standing",
  "holding",
  "wearing",
  "featuring",
  "features",
  "including",
  "includes",
  "showing",
  "shows",
  "depicting",
  "animated",
  "whimsical",
  "expressive",
  "plaid",
  "checkered",
  "group",
  "photo",
  "friends",
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
  // Slogan / state / context glue (Gate I anti-compound)
  "problem",
  "bath",
  "hotter",
  "than",
  "like",
  "sounds",
  "husband",
  "husbands",
  "wife",
  "live",
  "laugh",
  "toaster",
  "peace",
  "love",
  "just",
  "hit",
  "silhouette",
]);

function isAllowedSpecificityModifier(word: string): boolean {
  const normalized = word.trim().toLowerCase();
  if (normalized.length < 4) {
    return false;
  }
  if (SPECIFICITY_MODIFIER_BLOCKLIST.has(normalized)) {
    return false;
  }
  // Hyphenated OCR/slogan tokens (e.g. f-caw-f) are not breed/type modifiers.
  if (normalized.includes("-")) {
    return false;
  }
  return true;
}

function visibleTextTokenSet(visibleText: readonly string[] | undefined): Set<string> {
  const set = new Set<string>();
  for (const line of visibleText ?? []) {
    for (const word of tokenizeEvidenceWords(line)) {
      set.add(word);
    }
  }
  return set;
}

function phraseContiguousIn(value: string | undefined | null, phrase: string): boolean {
  const words = tokenizeEvidenceWords(value);
  const phraseWords = phrase
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  if (phraseWords.length < 2 || words.length < phraseWords.length) {
    return false;
  }
  for (let index = 0; index <= words.length - phraseWords.length; index += 1) {
    if (words.slice(index, index + phraseWords.length).join(" ") === phraseWords.join(" ")) {
      return true;
    }
  }
  return false;
}

/**
 * Title / centralSubject / description carries a more specific multi-word identity
 * while subjects only list a shorter head token (e.g. Highland cow → subject "cow").
 * Returns grounded phrases to promote into subjects (e.g. "highland cow").
 *
 * Anti-glue (normalizer-v4):
 * - Prefer description / centralSubject contiguous identity phrases.
 * - Title-only adjacency is accepted only for short identity-style titles where the
 *   phrase appears early (index < 3) AND the modifier is not a visible slogan token.
 */
export function findTitleGroundedSpecificSubjectPhrases(input: {
  title?: string;
  centralSubject?: string;
  description?: string;
  visibleText?: string[];
  subjects?: readonly string[];
}): string[] {
  const subjects = (input.subjects ?? []).map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (subjects.length === 0) {
    return [];
  }

  const preferredParts = [input.centralSubject, input.description]
    .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
    .map((part) => part.trim().toLowerCase());

  const titlePart =
    typeof input.title === "string" && input.title.trim().length > 0
      ? input.title.trim().toLowerCase()
      : null;

  const sloganTokens = visibleTextTokenSet(input.visibleText);
  const phrases: string[] = [];
  const seen = new Set<string>();

  const collectFromPart = (part: string, source: "preferred" | "title") => {
    const words = tokenizeEvidenceWords(part);
    if (words.length < 2) {
      return;
    }

    for (const subject of subjects) {
      if (subject.includes(" ")) {
        continue;
      }
      for (let index = 0; index < words.length - 1; index += 1) {
        const word = words[index]!;
        const next = words[index + 1]!;
        if (word === subject || next !== subject) {
          continue;
        }
        if (!isAllowedSpecificityModifier(word)) {
          continue;
        }
        const phrase = `${word} ${subject}`;
        if (seen.has(phrase)) {
          continue;
        }

        if (source === "title") {
          // Distrust slogan tails: modifier is printed slogan text, or phrase is late in a long title.
          if (sloganTokens.has(word)) {
            continue;
          }
          if (words.length > 6 && index >= 3) {
            continue;
          }
          if (index >= 3) {
            continue;
          }
        }

        seen.add(phrase);
        phrases.push(phrase);
      }
    }
  };

  for (const part of preferredParts) {
    collectFromPart(part, "preferred");
  }
  if (titlePart) {
    collectFromPart(titlePart, "title");
  }

  return phrases;
}

/**
 * Drop synthetic two-token compounds that are title/slogan glue or redundant merges
 * of already-listed character identities. Keeps genuine multi-word identities.
 */
export function sanitizeSyntheticSubjectCompounds(input: {
  subjects?: readonly string[];
  title?: string;
  centralSubject?: string;
  description?: string;
  visibleText?: string[];
}): string[] | undefined {
  const original = (input.subjects ?? []).map((s) => s.trim()).filter(Boolean);
  if (original.length === 0) {
    return undefined;
  }

  const lower = original.map((s) => s.toLowerCase());
  const kept: string[] = [];

  for (let index = 0; index < original.length; index += 1) {
    const subject = original[index]!;
    const normalized = lower[index]!;
    const words = normalized.split(/\s+/).filter(Boolean);

    if (words.length !== 2) {
      kept.push(subject);
      continue;
    }

    const [modifier, head] = words as [string, string];

    // Redundant merge of two identities already listed separately (e.g. donald goofy
    // beside Donald Duck + Goofy): head is an exact single-token subject AND modifier
    // is the first token of a different multi-word subject.
    const others = lower.filter((_, otherIndex) => otherIndex !== index);
    const headIsStandalone = others.some((other) => other === head);
    const modifierAnchorsOtherIdentity = others.some((other) => {
      const otherWords = other.split(/\s+/).filter(Boolean);
      return otherWords.length >= 2 && otherWords[0] === modifier;
    });
    if (headIsStandalone && modifierAnchorsOtherIdentity) {
      continue;
    }

    // Title-glue / slogan compounds without independent identity support.
    if (
      !multiWordSubjectHasIndependentSupport({
        token: normalized,
        title: input.title,
        description: input.description,
        centralSubject: input.centralSubject,
        visibleText: input.visibleText,
      })
    ) {
      continue;
    }

    // Modifier is visible slogan text and phrase is not in description/centralSubject.
    const sloganTokens = visibleTextTokenSet(input.visibleText);
    const inPreferred =
      phraseContiguousIn(input.description, normalized) ||
      phraseContiguousIn(input.centralSubject, normalized);
    if (!inPreferred && sloganTokens.has(modifier)) {
      continue;
    }

    kept.push(subject);
  }

  return kept.length > 0 ? kept : undefined;
}

/**
 * Prepend evidence-grounded specific subject phrases when subjects only have the generic head,
 * then strip synthetic compounds.
 */
export function promoteSubjectsWithTitleSpecificity(input: {
  title?: string;
  centralSubject?: string;
  description?: string;
  visibleText?: string[];
  subjects?: readonly string[];
}): string[] | undefined {
  const original = (input.subjects ?? []).map((s) => s.trim()).filter(Boolean);
  const phrases = findTitleGroundedSpecificSubjectPhrases({
    title: input.title,
    centralSubject: input.centralSubject,
    description: input.description,
    visibleText: input.visibleText,
    subjects: original,
  });

  const existingKeys = new Set(original.map((s) => s.toLowerCase()));
  const promoted: string[] = [];
  for (const phrase of phrases) {
    if (!existingKeys.has(phrase.toLowerCase())) {
      promoted.push(phrase);
      existingKeys.add(phrase.toLowerCase());
    }
  }

  const merged = [...promoted, ...original];
  return sanitizeSyntheticSubjectCompounds({
    subjects: merged,
    title: input.title,
    centralSubject: input.centralSubject,
    description: input.description,
    visibleText: input.visibleText,
  });
}

/**
 * Evidence carries a more specific multi-word identity while subjects only list a
 * shorter token contained in that identity (e.g. Highland cow → subject "cow").
 * Cleared when subjects already include a grounded specific phrase.
 */
export function detectSubjectSpecificityRisk(input: {
  title?: string;
  centralSubject?: string;
  description?: string;
  visibleText?: string[];
  subjects?: string[];
}): string | null {
  const subjects = (input.subjects ?? []).map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (subjects.length === 0) {
    return null;
  }

  const phrases = findTitleGroundedSpecificSubjectPhrases({
    title: input.title,
    centralSubject: input.centralSubject,
    description: input.description,
    visibleText: input.visibleText,
    subjects,
  });
  if (phrases.length === 0) {
    return null;
  }

  for (const phrase of phrases) {
    if (!subjects.includes(phrase.toLowerCase())) {
      const head = phrase.split(/\s+/).pop()!;
      return `subject_specificity_risk:${head}`;
    }
  }

  return null;
}
