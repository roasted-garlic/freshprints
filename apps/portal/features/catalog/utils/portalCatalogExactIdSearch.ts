import type { CatalogDesign } from '../types/catalog.types';
import { catalogService } from '../services/catalogService';

/** Firestore auto-ids are 20 chars; allow a tight band so title tokens do not trigger getDoc. */
const DESIGN_DOCUMENT_ID_MIN_LENGTH = 16;
const DESIGN_DOCUMENT_ID_MAX_LENGTH = 28;
const DESIGN_DOCUMENT_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

export interface ExactIdCatalogVisibilityOptions {
  categoryId?: string;
  selectedTags?: readonly string[];
}

export function looksLikeDesignDocumentId(query: string): boolean {
  const trimmed = query.trim();
  if (
    trimmed.length < DESIGN_DOCUMENT_ID_MIN_LENGTH ||
    trimmed.length > DESIGN_DOCUMENT_ID_MAX_LENGTH
  ) {
    return false;
  }
  if (/\s/.test(trimmed)) {
    return false;
  }
  return DESIGN_DOCUMENT_ID_PATTERN.test(trimmed);
}

export function exactIdDesignMatchesCatalogFilters(
  design: CatalogDesign,
  options: ExactIdCatalogVisibilityOptions,
): boolean {
  if (options.categoryId?.trim() && design.categoryId !== options.categoryId.trim()) {
    return false;
  }
  const selectedTags = options.selectedTags ?? [];
  if (selectedTags.length > 0 && !selectedTags.every((tag) => design.tags.includes(tag))) {
    return false;
  }
  return true;
}

export function mergeExactIdCatalogDesign(
  existing: CatalogDesign[],
  extra: CatalogDesign | null,
): CatalogDesign[] {
  if (!extra) {
    return existing;
  }
  if (existing.some((design) => design.id === extra.id)) {
    return existing;
  }
  return [extra, ...existing];
}

/**
 * One-document hydrate for a pasted full design ID. Never scans the catalog.
 * Missing / unauthorized / filter-mismatch docs return null.
 */
export async function fetchVisibleExactIdCatalogDesign(
  query: string,
  options: ExactIdCatalogVisibilityOptions = {},
): Promise<CatalogDesign | null> {
  if (!looksLikeDesignDocumentId(query)) {
    return null;
  }

  const [design] = await catalogService.getReadyDesignsByIds([query.trim()]);
  if (!design || !exactIdDesignMatchesCatalogFilters(design, options)) {
    return null;
  }
  return design;
}
