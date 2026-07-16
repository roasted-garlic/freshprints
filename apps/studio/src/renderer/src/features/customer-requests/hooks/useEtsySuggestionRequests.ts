import { useCallback, useEffect, useState } from "react";

import {
  etsySuggestionRequestsService,
  type EtsySuggestionRequestItem,
} from "../services/etsySuggestionRequestsService";

export function useEtsySuggestionRequests() {
  const [items, setItems] = useState<EtsySuggestionRequestItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    const unsubscribe = etsySuggestionRequestsService.subscribePending(
      (next) => {
        setItems(next);
        setIsLoading(false);
      },
      (message) => {
        setError(message);
        setIsLoading(false);
      },
    );
    return unsubscribe;
  }, []);

  const approve = useCallback(async (requestId: string) => {
    setIsMutating(true);
    setActionError(null);
    try {
      return await etsySuggestionRequestsService.approve(requestId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to approve that request.";
      setActionError(message);
      throw err;
    } finally {
      setIsMutating(false);
    }
  }, []);

  const reject = useCallback(async (requestId: string) => {
    setIsMutating(true);
    setActionError(null);
    try {
      return await etsySuggestionRequestsService.reject(requestId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to reject that request.";
      setActionError(message);
      throw err;
    } finally {
      setIsMutating(false);
    }
  }, []);

  return {
    items,
    isLoading,
    error,
    actionError,
    isMutating,
    approve,
    reject,
  };
}
