import type { User } from "../../users/types/user.types";

import type { Design } from "../types/design.types";

/** Firestore auto-ids are 20 chars; allow a tight band so title tokens do not trigger getDoc. */
const DESIGN_DOCUMENT_ID_MIN_LENGTH = 16;
const DESIGN_DOCUMENT_ID_MAX_LENGTH = 28;
const DESIGN_DOCUMENT_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

export interface ExactIdLibraryVisibilityOptions {
  browsingArchived: boolean;
  categoryId?: string;
  selectedTags?: readonly string[];
}

export type ExactIdDesignLoader = (caller: User, ids: string[]) => Promise<Design[]>;

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

export function designVisibleForExactIdLibrary(
  design: Design,
  browsingArchived: boolean,
): boolean {
  if (design.assetsPurgedAt) {
    return false;
  }
  if (browsingArchived) {
    return design.status === "archived";
  }
  return design.status === "ready";
}

export function exactIdDesignMatchesLibraryFilters(
  design: Design,
  options: ExactIdLibraryVisibilityOptions,
): boolean {
  if (!designVisibleForExactIdLibrary(design, options.browsingArchived)) {
    return false;
  }
  if (options.categoryId?.trim() && design.categoryId !== options.categoryId.trim()) {
    return false;
  }
  const selectedTags = options.selectedTags ?? [];
  if (selectedTags.length > 0 && !selectedTags.every((tag) => design.tags.includes(tag))) {
    return false;
  }
  return true;
}

export function mergeExactIdDesign(existing: Design[], extra: Design | null): Design[] {
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
export async function fetchVisibleExactIdDesign(
  caller: User,
  query: string,
  options: ExactIdLibraryVisibilityOptions,
  loadByIds: ExactIdDesignLoader,
): Promise<Design | null> {
  if (!looksLikeDesignDocumentId(query)) {
    return null;
  }

  const [design] = await loadByIds(caller, [query.trim()]);
  if (!design || !exactIdDesignMatchesLibraryFilters(design, options)) {
    return null;
  }
  return design;
}
