import { httpsCallable } from "firebase/functions";

import type {
  ArchiveCategoryWithGuardsResponse,
  ArchiveTagWithGuardsResponse,
  PreviewCategoryArchiveResponse,
  PreviewTagArchiveResponse,
} from "@fresh-prints/shared/types/deletion/deletion.types";

import { functions } from "../../../config/firebase";

function getCallableErrorMessage(error: unknown, fallbackMessage: string): string {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string" &&
    error.message.trim()
  ) {
    return error.message;
  }
  return fallbackMessage;
}

export const taxonomyArchiveGuardsService = {
  async previewCategory(categoryId: string): Promise<PreviewCategoryArchiveResponse> {
    try {
      const callable = httpsCallable<{ categoryId: string }, PreviewCategoryArchiveResponse>(
        functions,
        "previewCategoryArchive",
      );
      const response = await callable({ categoryId });
      return response.data;
    } catch (error) {
      throw new Error(
        getCallableErrorMessage(error, "Unable to preview category archive. Please try again."),
      );
    }
  },

  async archiveCategory(categoryId: string): Promise<ArchiveCategoryWithGuardsResponse> {
    try {
      const callable = httpsCallable<{ categoryId: string }, ArchiveCategoryWithGuardsResponse>(
        functions,
        "archiveCategoryWithGuards",
      );
      const response = await callable({ categoryId });
      return response.data;
    } catch (error) {
      throw new Error(
        getCallableErrorMessage(error, "Unable to archive the category. Please try again."),
      );
    }
  },

  async previewTag(tagId: string): Promise<PreviewTagArchiveResponse> {
    try {
      const callable = httpsCallable<{ tagId: string }, PreviewTagArchiveResponse>(
        functions,
        "previewTagArchive",
      );
      const response = await callable({ tagId });
      return response.data;
    } catch (error) {
      throw new Error(getCallableErrorMessage(error, "Unable to preview tag archive. Please try again."));
    }
  },

  async archiveTag(tagId: string): Promise<ArchiveTagWithGuardsResponse> {
    try {
      const callable = httpsCallable<{ tagId: string }, ArchiveTagWithGuardsResponse>(
        functions,
        "archiveTagWithGuards",
      );
      const response = await callable({ tagId });
      return response.data;
    } catch (error) {
      throw new Error(getCallableErrorMessage(error, "Unable to archive the tag. Please try again."));
    }
  },
};
