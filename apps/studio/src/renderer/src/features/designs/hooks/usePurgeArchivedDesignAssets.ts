import { useCallback, useState } from "react";

import type { PurgeArchivedDesignAssetsRequest } from "@fresh-prints/shared/types/admin/purgeArchivedDesignAssets.types";

import { useAuth } from "../../auth/hooks/useAuth";
import { permissionService } from "../../permissions/services/permissionService";
import { purgeArchivedDesignAssets } from "../services/purgeArchivedDesignAssetsService";

export function usePurgeArchivedDesignAssets() {
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const purgeDesigns = useCallback(
    async (input: PurgeArchivedDesignAssetsRequest) => {
      if (!permissionService.canPurgeArchivedDesignAssets(user)) {
        const message = "Only owners can delete archived design images.";
        setError(message);
        throw new Error(message);
      }

      setIsSubmitting(true);
      setError(null);

      try {
        return await purgeArchivedDesignAssets(input);
      } catch (purgeError) {
        const message =
          purgeError instanceof Error
            ? purgeError.message
            : "Unable to delete archived design images. Please try again.";
        setError(message);
        throw purgeError instanceof Error ? purgeError : new Error(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [user],
  );

  return {
    clearError,
    error,
    isSubmitting,
    purgeDesigns,
  };
}
