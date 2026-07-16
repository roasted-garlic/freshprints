import { useEffect, useState } from "react";

import {
  etsyRecommendationRequestsService,
  type EtsyRecommendationRequestListItem,
} from "../services/etsyRecommendationRequestsService";

export function useEtsyRecommendationRequests() {
  const [items, setItems] = useState<EtsyRecommendationRequestListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    const unsubscribe = etsyRecommendationRequestsService.subscribeRecent(
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

  return { items, isLoading, error };
}
