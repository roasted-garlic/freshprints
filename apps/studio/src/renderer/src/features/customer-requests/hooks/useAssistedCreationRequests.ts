import { useEffect, useState } from "react";

import {
  assistedCreationRequestsService,
  type AssistedCreationRequestListItem,
} from "../services/assistedCreationRequestsService";

export function useAssistedCreationRequests() {
  const [items, setItems] = useState<AssistedCreationRequestListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    const unsubscribe = assistedCreationRequestsService.subscribeRecent(
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
