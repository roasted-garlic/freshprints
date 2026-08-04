export interface DesignLibraryFirestoreLoadPolicy {
  loadCategories: boolean;
  loadReadyDesignPage: boolean;
  loadTags: boolean;
}

/**
 * The design LIST is always bounded-Firestore-authoritative for normal (non-archived) browse —
 * see the post-launch-catalog-and-processing-stability Owner QA Amendment 1 Plan. A generated
 * Storage snapshot that fetches successfully but is merely stale (has not yet republished a
 * newly-approved design) previously left approved designs permanently invisible in Studio Design
 * Library, because nothing ever fell back to Firestore in that case — only an outright fetch
 * *failure* triggered fallback. Firestore is cheap for this specific read (already bounded,
 * cached, ≤101 docs per page — see the Wave C Plan's own read inventory) and is now unconditional
 * for both archived and normal browse.
 *
 * Categories/tags remain generated-taxonomy-first for normal browse — that read genuinely was the
 * expensive part Wave C's Studio amendment targeted (~1,122 tags + ≤200 categories per cold entry)
 * and is unaffected by this correction.
 */
export function getDesignLibraryFirestoreLoadPolicy(input: {
  generatedTaxonomyStatus: "loading" | "ready" | "failed" | "inactive";
  requiresFullCategoryManagementData?: boolean;
  usingGeneratedCatalog: boolean;
}): DesignLibraryFirestoreLoadPolicy {
  if (!input.usingGeneratedCatalog) {
    return { loadCategories: true, loadReadyDesignPage: true, loadTags: true };
  }
  return {
    loadCategories: input.requiresFullCategoryManagementData === true,
    loadReadyDesignPage: true,
    loadTags: false,
  };
}
