import type {
  CatalogTag,
  CreateCatalogTagInput,
  UpdateCatalogTagInput,
} from "../types/catalogTag.types";

interface RetiredCatalogTagsState {
  actionError: string | null;
  error: string | null;
  isLoading: boolean;
  isSubmitting: boolean;
  tags: CatalogTag[];
}

interface BulkCreateCatalogTagsResult {
  createdNames: string[];
  failures: Array<{ message: string; name: string }>;
}

const RETIRED_TAG_OPERATION_MESSAGE =
  "Legacy catalog tag operations are retired; use Smart Profile discovery instead.";

/**
 * Retired compatibility export. No active Studio surface may read or mutate the legacy tag
 * taxonomy. Keeping the shape prevents stale downstream imports from reintroducing an active
 * Firestore path; every write method fails closed if an old bundle calls it.
 */
export function useCatalogTags(_options: { enabled?: boolean; includeArchived?: boolean } = {}) {
  const state: RetiredCatalogTagsState = {
    actionError: null,
    error: null,
    isLoading: false,
    isSubmitting: false,
    tags: [],
  };

  const retired = async (): Promise<never> => {
    throw new Error(RETIRED_TAG_OPERATION_MESSAGE);
  };

  const reloadTags = async (): Promise<void> => undefined;
  const clearActionError = (): void => undefined;

  return {
    ...state,
    archiveTag: retired,
    approveSuggestedTag: retired,
    bulkCreateTags: async (
      _inputs: readonly CreateCatalogTagInput[],
    ): Promise<BulkCreateCatalogTagsResult> => retired(),
    clearActionError,
    createTag: async (_input: CreateCatalogTagInput): Promise<never> => retired(),
    reloadTags,
    restoreTag: async (_tagId: string): Promise<never> => retired(),
    updateTag: async (_tagId: string, _input: UpdateCatalogTagInput): Promise<never> => retired(),
  };
}
