export interface DesignLibraryFirestoreLoadPolicy {
  loadCategories: boolean;
  loadReadyDesignPage: boolean;
}

/**
 * Phase 1A: design LIST remains bounded-Firestore-authoritative. Display taxonomy is also
 * Firestore-backed via `useGeneratedDesignLibraryTaxonomy` (active/approved). Full
 * category management still loads archived-inclusive Firestore hooks when needed.
 */
export function getDesignLibraryFirestoreLoadPolicy(input: {
  requiresFullCategoryManagementData?: boolean;
  includeArchived: boolean;
}): DesignLibraryFirestoreLoadPolicy {
  if (input.includeArchived || input.requiresFullCategoryManagementData === true) {
    return { loadCategories: true, loadReadyDesignPage: true };
  }
  // Normal browse: taxonomy comes from useGeneratedDesignLibraryTaxonomy (Firestore active/approved).
  // Skip duplicate full archived taxonomy hooks unless management modal needs them.
  return {
    loadCategories: false,
    loadReadyDesignPage: true,
  };
}
