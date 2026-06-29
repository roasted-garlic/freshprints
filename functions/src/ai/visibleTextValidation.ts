export const VISIBLE_TEXT_RETRY_CONFIDENCE_THRESHOLD = 0.75;

const HOMOPHONE_DRIFT_PATTERNS = [
  /\bslipped\b/i,
  /\bsleeperdeprived\b/i,
  /\bdepreived\b/i,
  /\bmotherhood\b.*\bother\b/i,
];

export function hasGibberishFragmentation(phrase: string): boolean {
  const tokens = phrase.trim().split(/\s+/).filter(Boolean);

  if (tokens.length < 4) {
    return false;
  }

  const shortTokens = tokens.filter((token) => token.replace(/[^a-zA-Z]/g, "").length <= 3);
  return shortTokens.length / tokens.length >= 0.5;
}

export function hasMergedWordPhrase(phrase: string): boolean {
  const compact = phrase.replace(/\s+/g, "");

  if (compact.length < 12) {
    return false;
  }

  if (/\s/.test(phrase.trim())) {
    return false;
  }

  return /^[A-Za-z]+$/.test(compact);
}

export function looksLikeCombinedDualArcPhrase(phrase: string): boolean {
  const words = phrase.trim().split(/\s+/).filter(Boolean);

  if (words.length < 4) {
    return false;
  }

  const lower = phrase.toLowerCase();

  return (
    (/\b(sleep|slipped|sleeper)\b/.test(lower) && /\bdepriv/.test(lower) && /\bbarely\b/.test(lower)) ||
    (/\bdepriv/.test(lower) && /\balive\b/.test(lower) && words.length >= 4)
  );
}

export function hasKnownHomophoneDrift(phrase: string): boolean {
  return HOMOPHONE_DRIFT_PATTERNS.some((pattern) => pattern.test(phrase));
}

export function isImplausibleVisibleText(phrases: string[]): boolean {
  if (phrases.length === 0) {
    return false;
  }

  if (phrases.length === 1 && looksLikeCombinedDualArcPhrase(phrases[0]!)) {
    return true;
  }

  return phrases.some(
    (phrase) =>
      hasGibberishFragmentation(phrase) ||
      hasMergedWordPhrase(phrase) ||
      hasKnownHomophoneDrift(phrase),
  );
}

export function extractVisibleTextFromDescription(description: string | undefined): string[] | undefined {
  if (!description?.trim()) {
    return undefined;
  }

  const firstSentence = description.split(/[.!?]/)[0]?.trim() ?? "";

  if (!firstSentence.includes(" / ")) {
    return undefined;
  }

  const phrases = firstSentence
    .split(" / ")
    .map((phrase) => phrase.trim())
    .filter(Boolean);

  return phrases.length > 0 ? phrases : undefined;
}

export function shouldRetryVisibleTextOcr(input: {
  artworkContainsText: boolean;
  phrases: string[] | undefined;
  textRecognitionConfidence: number | undefined;
}): boolean {
  if (!input.artworkContainsText || !input.phrases?.length) {
    return false;
  }

  if (
    input.textRecognitionConfidence !== undefined &&
    input.textRecognitionConfidence < VISIBLE_TEXT_RETRY_CONFIDENCE_THRESHOLD
  ) {
    return true;
  }

  return isImplausibleVisibleText(input.phrases);
}

export function resolveVisibleTextPhrases(input: {
  artworkContainsText: boolean;
  candidatePhrases: string[] | undefined;
  description?: string;
}): {
  phrases: string[] | undefined;
  usedDescriptionFallback: boolean;
  stillImplausible: boolean;
} {
  const phrases = input.candidatePhrases;

  if (!input.artworkContainsText || !phrases?.length) {
    return { phrases, stillImplausible: false, usedDescriptionFallback: false };
  }

  if (!isImplausibleVisibleText(phrases)) {
    return { phrases, stillImplausible: false, usedDescriptionFallback: false };
  }

  const fromDescription = extractVisibleTextFromDescription(input.description);

  if (fromDescription && !isImplausibleVisibleText(fromDescription)) {
    return {
      phrases: fromDescription,
      stillImplausible: false,
      usedDescriptionFallback: true,
    };
  }

  return {
    phrases,
    stillImplausible: isImplausibleVisibleText(phrases),
    usedDescriptionFallback: false,
  };
}
