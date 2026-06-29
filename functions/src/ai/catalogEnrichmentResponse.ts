import {
  filterBackgroundColorsFromPalette,
  normalizeComparableTitle,
  normalizeVisibleTextColor,
  normalizeVisibleTextPhrases,
} from "./catalogTitleRules";

type VisibleTextColor = "black" | "white" | "mixed" | "unknown";

const SUPPORTING_ARTWORK_KEYWORDS = [
  "animal",
  "mascot",
  "character",
  "icon",
  "banner",
  "ribbon",
  "logo",
  "floral",
  "flower",
  "star",
  "heart",
  "illustration",
  "cartoon",
  "raccoon",
  "bear",
  "cow",
  "dog",
  "cat",
  "skull",
  "skeleton",
  "prop",
  "decoration",
  "decorative",
  "clip art",
  "clipart",
];

export interface ParsedCatalogEnrichmentResponse {
  title?: string;
  description: string;
  categoryName?: string;
  tags: unknown;
  primarySubject?: string;
  theme?: string;
  style?: string;
  audience?: string;
  colorPalette?: string[];
  artworkContainsText: boolean;
  visibleText?: string[];
  visibleTextColor?: VisibleTextColor;
  textOnlyArtwork?: boolean;
  textRecognitionConfidence?: number;
  overallConfidence?: number;
}

function coerceString(value: unknown): string | undefined {
  return typeof value === "string" ? value.trim() : undefined;
}

function coerceBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (normalized === "true") {
      return true;
    }

    if (normalized === "false") {
      return false;
    }
  }

  return undefined;
}

function coerceConfidence(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.min(1, Math.max(0, value));
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.trim());

    if (Number.isFinite(parsed)) {
      return Math.min(1, Math.max(0, parsed));
    }
  }

  return undefined;
}

function coerceStringArray(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    const items = value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);

    return items.length > 0 ? items : undefined;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) {
      return undefined;
    }

    if (trimmed.includes(",")) {
      const items = trimmed
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      return items.length > 0 ? items : [trimmed];
    }

    return [trimmed];
  }

  return undefined;
}

function coerceTagsRaw(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) {
      return [];
    }

    if (trimmed.includes(",")) {
      return trimmed.split(",").map((item) => item.trim()).filter(Boolean);
    }

    return trimmed.split(/\s+/).filter(Boolean);
  }

  return [];
}

export function normalizeVisibleTextColorFromRaw(value: unknown): VisibleTextColor | undefined {
  if (Array.isArray(value)) {
    const colors = value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.toLowerCase().trim())
      .filter(Boolean);

    if (colors.length === 0) {
      return undefined;
    }

    const hasBlack = colors.some((color) => /\bblack\b/.test(color));
    const hasWhite = colors.some((color) => /\bwhite\b/.test(color));

    if (hasBlack && hasWhite) {
      return "mixed";
    }

    if (hasBlack) {
      return "black";
    }

    if (hasWhite) {
      return "white";
    }

    if (colors.length > 1) {
      return "mixed";
    }

    return "unknown";
  }

  return normalizeVisibleTextColor(value);
}

export function hasSupportingArtworkIndicators(input: {
  primarySubject?: string;
  theme?: string;
  tags?: string[];
}): boolean {
  const haystack = [input.primarySubject, input.theme, ...(input.tags ?? [])]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" ")
    .toLowerCase();

  if (!haystack) {
    return false;
  }

  return SUPPORTING_ARTWORK_KEYWORDS.some((keyword) => haystack.includes(keyword));
}

export function applyCatalogEnrichmentConsistencyRules(
  parsed: ParsedCatalogEnrichmentResponse,
): ParsedCatalogEnrichmentResponse {
  const visibleText = parsed.visibleText ?? [];
  let artworkContainsText = parsed.artworkContainsText;
  let textOnlyArtwork = parsed.textOnlyArtwork;

  if (visibleText.length > 0) {
    artworkContainsText = true;
  } else {
    artworkContainsText = false;
  }

  if (
    textOnlyArtwork === true &&
    hasSupportingArtworkIndicators({
      primarySubject: parsed.primarySubject,
      theme: parsed.theme,
      tags: Array.isArray(parsed.tags)
        ? parsed.tags.filter((tag): tag is string => typeof tag === "string")
        : undefined,
    })
  ) {
    textOnlyArtwork = false;
  }

  return {
    ...parsed,
    artworkContainsText,
    textOnlyArtwork,
  };
}

export function hasArtworkContainsTextConflict(
  artworkContainsText: boolean,
  visibleText: string[] | undefined,
): boolean {
  const phraseCount = visibleText?.length ?? 0;

  if (phraseCount > 0 && artworkContainsText === false) {
    return true;
  }

  if (phraseCount === 0 && artworkContainsText === true) {
    return true;
  }

  return false;
}

export function parseCatalogEnrichmentResponse(
  raw: Record<string, unknown>,
): ParsedCatalogEnrichmentResponse {
  const visibleText = normalizeVisibleTextPhrases(coerceStringArray(raw.visibleText) ?? []) ?? [];
  const artworkContainsText =
    coerceBoolean(raw.artworkContainsText) ?? Boolean(visibleText.length);
  const colorPalette = filterBackgroundColorsFromPalette(coerceStringArray(raw.colorPalette));

  const parsed: ParsedCatalogEnrichmentResponse = {
    title: coerceString(raw.title),
    description: coerceString(raw.description) ?? "",
    categoryName: coerceString(raw.categoryName),
    tags: coerceTagsRaw(raw.tags),
    primarySubject: coerceString(raw.primarySubject),
    theme: coerceString(raw.theme),
    style: coerceString(raw.style),
    audience: coerceString(raw.audience),
    colorPalette,
    artworkContainsText,
    visibleText: visibleText.length > 0 ? visibleText : undefined,
    visibleTextColor: normalizeVisibleTextColorFromRaw(raw.visibleTextColor),
    textOnlyArtwork: coerceBoolean(raw.textOnlyArtwork),
    textRecognitionConfidence: coerceConfidence(raw.textRecognitionConfidence),
    overallConfidence: coerceConfidence(raw.overallConfidence),
  };

  return applyCatalogEnrichmentConsistencyRules(parsed);
}

export function subjectLooksLikeIllustration(primarySubject: string | undefined): boolean {
  if (!primarySubject?.trim()) {
    return false;
  }

  const comparable = normalizeComparableTitle(primarySubject);

  return SUPPORTING_ARTWORK_KEYWORDS.some((keyword) => comparable.includes(keyword.replace(/\s+/g, " ")));
}
