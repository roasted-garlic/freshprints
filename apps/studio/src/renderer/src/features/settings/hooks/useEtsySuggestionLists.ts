import { useCallback, useEffect, useState } from "react";

import type { AdminSuggestionOverlay } from "@fresh-prints/shared/constants/etsyRecommendation/etsyRecommendationSuggestionLists";
import type { EtsyRecommendationSuggestionKind } from "@fresh-prints/shared/types/etsyRecommendation/etsyRecommendationActions.types";

import { etsySuggestionListsService } from "../services/etsySuggestionListsService";

export function useEtsySuggestionLists(kind: EtsyRecommendationSuggestionKind) {
  const [overlays, setOverlays] = useState<AdminSuggestionOverlay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    const unsubscribe = etsySuggestionListsService.subscribeActiveByKind(
      kind,
      (next) => {
        setOverlays(next);
        setIsLoading(false);
      },
      (message) => {
        setError(message);
        setIsLoading(false);
      },
    );
    return unsubscribe;
  }, [kind]);

  const addSuggestion = useCallback(
    async (input: { label: string; apiToken?: string; aliases?: string[] }) => {
      setIsMutating(true);
      setActionError(null);
      try {
        await etsySuggestionListsService.addSuggestion({
          kind,
          label: input.label,
          ...(input.apiToken ? { apiToken: input.apiToken } : {}),
          ...(input.aliases?.length ? { aliases: input.aliases } : {}),
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unable to add suggestion.";
        setActionError(message);
        throw err;
      } finally {
        setIsMutating(false);
      }
    },
    [kind],
  );

  const deactivateSuggestion = useCallback(async (suggestionId: string) => {
    setIsMutating(true);
    setActionError(null);
    try {
      await etsySuggestionListsService.deactivateSuggestion(suggestionId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to deactivate suggestion.";
      setActionError(message);
      throw err;
    } finally {
      setIsMutating(false);
    }
  }, []);

  return {
    overlays,
    isLoading,
    error,
    actionError,
    isMutating,
    addSuggestion,
    deactivateSuggestion,
  };
}
