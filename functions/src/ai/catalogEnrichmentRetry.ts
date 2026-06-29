import {
  CANVAS_PALETTE_TERMS,
  isGenericCatalogTitle,
  isPlaceholderCatalogDescription,
  sanitizeCatalogDescription,
} from "./catalogTitleRules";
import { hasArtworkContainsTextConflict } from "./catalogEnrichmentResponse";
import { isImplausibleVisibleText, shouldRetryVisibleTextOcr } from "./visibleTextValidation";

export type CatalogEnrichmentRetryReason =
  | "placeholder_description"
  | "implausible_visible_text"
  | "generic_title"
  | "category_mismatch"
  | "insufficient_tags"
  | "canvas_palette"
  | "artwork_text_conflict"
  | "low_text_confidence";

export interface ShouldRetryCatalogEnrichmentInput {
  description: string;
  title: string;
  visibleText?: string[];
  artworkContainsText: boolean;
  textRecognitionConfidence?: number;
  categoryName?: string;
  allowedCategoryNames: string[];
  categoryRemapped: boolean;
  tags: string[];
  rawColorPalette?: string[];
  isRetryPass: boolean;
}

export interface ShouldRetryCatalogEnrichmentResult {
  shouldRetry: boolean;
  reasons: CatalogEnrichmentRetryReason[];
}

const MIN_USABLE_TAGS = 5;

function paletteContainsCanvasTerms(colorPalette: string[] | undefined): boolean {
  if (!colorPalette?.length) {
    return false;
  }

  return colorPalette.some((color) => {
    const lower = color.toLowerCase().trim();

    if (CANVAS_PALETTE_TERMS.has(lower)) {
      return true;
    }

    return /\b(background|backdrop|canvas|matte|surrounding|neutral|letterbox)\b/i.test(lower);
  });
}

function isCategoryMismatch(
  categoryName: string | undefined,
  allowedCategoryNames: string[],
  categoryRemapped: boolean,
): boolean {
  if (allowedCategoryNames.length === 0 || !categoryName) {
    return false;
  }

  if (categoryRemapped) {
    return false;
  }

  const allowed = new Set(allowedCategoryNames.map((name) => name.toLowerCase()));

  return !allowed.has(categoryName.toLowerCase());
}

export function shouldRetryCatalogEnrichment(
  input: ShouldRetryCatalogEnrichmentInput,
): ShouldRetryCatalogEnrichmentResult {
  if (input.isRetryPass) {
    return { shouldRetry: false, reasons: [] };
  }

  const reasons: CatalogEnrichmentRetryReason[] = [];
  const sanitizedDescription = sanitizeCatalogDescription(input.description);

  if (isPlaceholderCatalogDescription(input.description) || isPlaceholderCatalogDescription(sanitizedDescription)) {
    reasons.push("placeholder_description");
  }

  if (
    shouldRetryVisibleTextOcr({
      artworkContainsText: input.artworkContainsText,
      phrases: input.visibleText,
      textRecognitionConfidence: input.textRecognitionConfidence,
    })
  ) {
    if (
      input.textRecognitionConfidence !== undefined &&
      input.textRecognitionConfidence < 0.75
    ) {
      reasons.push("low_text_confidence");
    }

    if (input.visibleText && isImplausibleVisibleText(input.visibleText)) {
      reasons.push("implausible_visible_text");
    }
  }

  if (isGenericCatalogTitle(input.title)) {
    reasons.push("generic_title");
  }

  if (isCategoryMismatch(input.categoryName, input.allowedCategoryNames, input.categoryRemapped)) {
    reasons.push("category_mismatch");
  }

  if (input.tags.length < MIN_USABLE_TAGS) {
    reasons.push("insufficient_tags");
  }

  if (paletteContainsCanvasTerms(input.rawColorPalette)) {
    reasons.push("canvas_palette");
  }

  if (hasArtworkContainsTextConflict(input.artworkContainsText, input.visibleText)) {
    reasons.push("artwork_text_conflict");
  }

  return {
    shouldRetry: reasons.length > 0,
    reasons: [...new Set(reasons)],
  };
}
