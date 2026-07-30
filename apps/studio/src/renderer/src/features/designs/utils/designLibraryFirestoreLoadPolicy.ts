export interface DesignLibraryFirestoreLoadPolicy {
  loadCategories: boolean;
  loadReadyDesignPage: boolean;
  loadTags: boolean;
}

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
    loadReadyDesignPage: false,
    loadTags: false,
  };
}
