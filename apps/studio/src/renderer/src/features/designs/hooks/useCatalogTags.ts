import { useCallback, useEffect, useState } from "react";

import { useAuth } from "../../auth/hooks/useAuth";
import { permissionService } from "../../permissions/services/permissionService";
import { catalogTagService } from "../services/catalogTagService";
import { taxonomyArchiveGuardsService } from "../services/taxonomyArchiveGuardsService";
import type {
  CatalogTag,
  CreateCatalogTagInput,
  UpdateCatalogTagInput,
} from "../types/catalogTag.types";

interface CatalogTagsState {
  error: string | null;
  isLoading: boolean;
  tags: CatalogTag[];
}

interface BulkCreateCatalogTagsResult {
  createdNames: string[];
  failures: Array<{ message: string; name: string }>;
}

const initialState: CatalogTagsState = {
  error: null,
  isLoading: true,
  tags: [],
};

export function useCatalogTags(options: { includeArchived?: boolean } = {}) {
  const { user } = useAuth();
  const [state, setState] = useState<CatalogTagsState>(initialState);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const clearActionError = useCallback(() => {
    setActionError(null);
  }, []);

  const loadTags = useCallback(async () => {
    if (!user || !permissionService.canViewDesigns(user)) {
      setState({ error: null, isLoading: false, tags: [] });
      return;
    }

    setState((currentState) => ({ ...currentState, error: null, isLoading: true }));

    try {
      const tags = await catalogTagService.listTags(user, {
        includeArchived: options.includeArchived,
      });
      setState({ error: null, isLoading: false, tags });
    } catch (error) {
      setState({
        error: error instanceof Error ? error.message : "Unable to load tags.",
        isLoading: false,
        tags: [],
      });
    }
  }, [options.includeArchived, user]);

  useEffect(() => {
    void loadTags();
  }, [loadTags]);

  const runAction = useCallback(
    async <T>(action: () => Promise<T>): Promise<T> => {
      setIsSubmitting(true);
      setActionError(null);

      try {
        const result = await action();
        await loadTags();
        setIsSubmitting(false);
        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to update tags.";
        setActionError(message);
        setIsSubmitting(false);
        throw error;
      }
    },
    [loadTags],
  );

  const createTag = useCallback(
    async (input: CreateCatalogTagInput) => {
      if (!user) {
        throw new Error("You must be signed in to manage tags.");
      }

      return runAction(() => catalogTagService.createTag(user, input));
    },
    [runAction, user],
  );

  const updateTag = useCallback(
    async (tagId: string, input: UpdateCatalogTagInput) => {
      if (!user) {
        throw new Error("You must be signed in to manage tags.");
      }

      return runAction(() => catalogTagService.updateTag(user, tagId, input));
    },
    [runAction, user],
  );

  const archiveTag = useCallback(
    async (tagId: string) => {
      if (!user) {
        throw new Error("You must be signed in to manage tags.");
      }

      return runAction(async () => {
        const result = await taxonomyArchiveGuardsService.archiveTag(tagId);
        if (result.outcome === "blocked") {
          throw new Error(result.blockers?.[0]?.message ?? result.message);
        }
        return result;
      });
    },
    [runAction, user],
  );

  const approveSuggestedTag = useCallback(
    async (input: CreateCatalogTagInput) => {
      if (!user) {
        throw new Error("You must be signed in to approve suggested tags.");
      }

      return runAction(() => catalogTagService.approveSuggestedTag(user, input));
    },
    [runAction, user],
  );

  const bulkCreateTags = useCallback(
    async (inputs: readonly CreateCatalogTagInput[]): Promise<BulkCreateCatalogTagsResult> => {
      if (!user) {
        throw new Error("You must be signed in to manage tags.");
      }

      setIsSubmitting(true);
      setActionError(null);

      const result: BulkCreateCatalogTagsResult = {
        createdNames: [],
        failures: [],
      };

      try {
        const outcomes = await catalogTagService.bulkCreateTags(user, inputs);

        for (let i = 0; i < outcomes.length; i++) {
          const outcome = outcomes[i];
          const input = inputs[i];

          if ("tag" in outcome) {
            result.createdNames.push(input.name);
          } else {
            result.failures.push({
              message: outcome.error.message,
              name: input.name,
            });
          }
        }

        await loadTags();
        setIsSubmitting(false);
        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to update tags.";
        setActionError(message);
        setIsSubmitting(false);
        throw error;
      }
    },
    [loadTags, user],
  );

  return {
    ...state,
    actionError,
    archiveTag,
    approveSuggestedTag,
    bulkCreateTags,
    clearActionError,
    createTag,
    isSubmitting,
    reloadTags: loadTags,
    updateTag,
  };
}
