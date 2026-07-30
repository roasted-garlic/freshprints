import type {
  ArchiveCategoryWithGuardsResponse,
  ArchiveTagWithGuardsResponse,
  PreviewCategoryArchiveResponse,
  PreviewTagArchiveResponse,
} from "@fresh-prints/shared/types/deletion/deletion.types";

import { callTracedFunction } from "../../../config/tracedCallable";

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
      return await callTracedFunction<{ categoryId: string }, PreviewCategoryArchiveResponse>(
        "previewCategoryArchive",
        { source: "taxonomyArchiveGuardsService.previewCategory" },
      )({ categoryId });
    } catch (error) {
      throw new Error(
        getCallableErrorMessage(error, "Unable to preview category archive. Please try again."),
      );
    }
  },

  async archiveCategory(categoryId: string): Promise<ArchiveCategoryWithGuardsResponse> {
    try {
      return await callTracedFunction<{ categoryId: string }, ArchiveCategoryWithGuardsResponse>(
        "archiveCategoryWithGuards",
        { source: "taxonomyArchiveGuardsService.archiveCategory" },
      )({ categoryId });
    } catch (error) {
      throw new Error(
        getCallableErrorMessage(error, "Unable to archive the category. Please try again."),
      );
    }
  },

  async previewTag(tagId: string): Promise<PreviewTagArchiveResponse> {
    try {
      return await callTracedFunction<{ tagId: string }, PreviewTagArchiveResponse>(
        "previewTagArchive",
        { source: "taxonomyArchiveGuardsService.previewTag" },
      )({ tagId });
    } catch (error) {
      throw new Error(getCallableErrorMessage(error, "Unable to preview tag archive. Please try again."));
    }
  },

  async archiveTag(tagId: string): Promise<ArchiveTagWithGuardsResponse> {
    try {
      return await callTracedFunction<{ tagId: string }, ArchiveTagWithGuardsResponse>(
        "archiveTagWithGuards",
        { source: "taxonomyArchiveGuardsService.archiveTag" },
      )({ tagId });
    } catch (error) {
      throw new Error(getCallableErrorMessage(error, "Unable to archive the tag. Please try again."));
    }
  },
};
