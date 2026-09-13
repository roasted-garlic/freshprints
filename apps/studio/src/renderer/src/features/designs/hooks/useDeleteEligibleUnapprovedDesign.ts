import { useCallback, useState } from "react";

import type { DeleteEligibleUnapprovedDesignRequest } from "@fresh-prints/shared/types/admin/deleteEligibleUnapprovedDesign.types";

import { useAuth } from "../../auth/hooks/useAuth";
import { permissionService } from "../../permissions/services/permissionService";
import { deleteEligibleUnapprovedDesigns } from "../services/deleteEligibleUnapprovedDesignService";

export function useDeleteEligibleUnapprovedDesign() {
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /** Non-throw failures (callable returned only failed items) for the confirm dialog. */
  const reportError = useCallback((message: string) => {
    setError(message);
  }, []);

  const deleteDesigns = useCallback(
    async (input: DeleteEligibleUnapprovedDesignRequest) => {
      if (!permissionService.canDeleteEligibleUnapprovedDesigns(user)) {
        const message = "Only owners can permanently delete eligible unapproved designs.";
        setError(message);
        throw new Error(message);
      }

      setIsSubmitting(true);
      setError(null);

      try {
        return await deleteEligibleUnapprovedDesigns(input);
      } catch (deleteError) {
        const message =
          deleteError instanceof Error
            ? deleteError.message
            : "Unable to permanently delete unapproved designs. Please try again.";
        setError(message);
        throw deleteError instanceof Error ? deleteError : new Error(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [user],
  );

  return {
    clearError,
    deleteDesigns,
    error,
    isSubmitting,
    reportError,
  };
}
