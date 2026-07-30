import type { Design } from "../types/design.types";
import type { ReadyIndexEntry } from "./generatedReadyDesignMapping";
import {
  sortDesignsForListQuery,
  sortListItemsByExplicitMillis,
} from "./sortDesignsForListQuery";

export interface SortDesignLibraryResultsOptions {
  designs: readonly Design[];
  generatedEntries: readonly ReadyIndexEntry[];
  useGeneratedOrdering: boolean;
}

/**
 * Owns the generated/Firestore sort boundary for the Design Library.
 * Generated filter records use ready-index milliseconds; persisted records use real Timestamps.
 */
export function sortDesignLibraryResults({
  designs,
  generatedEntries,
  useGeneratedOrdering,
}: SortDesignLibraryResultsOptions): Design[] {
  if (useGeneratedOrdering) {
    const createdAtMsById = new Map(
      generatedEntries.map((entry) => [entry.id, entry.createdAtMs]),
    );
    return sortListItemsByExplicitMillis(
      designs,
      (design) => createdAtMsById.get(design.id),
      "desc",
    );
  }

  return sortDesignsForListQuery(designs, "createdAt", "desc");
}
