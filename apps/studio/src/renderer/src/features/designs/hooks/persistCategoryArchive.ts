import type { User } from "../../users/types/user.types";
import type { Category } from "../types/category.types";
import type { ArchiveCategoryWithGuardsResponse } from "@fresh-prints/shared/types/deletion/deletion.types";

function isDesignReferenceBlockMessage(message: string): boolean {
  return /still use it|referenced by designs|cannot be archived while/i.test(message);
}

export interface PersistCategoryArchiveDeps {
  archiveViaGuards: (categoryId: string) => Promise<ArchiveCategoryWithGuardsResponse>;
  archiveViaClient: (caller: User, categoryId: string) => Promise<Category>;
  getCategoryById: (caller: User, categoryId: string) => Promise<Category>;
  clearCaches: () => void;
}

/**
 * Persists category archive to Firestore and refuses to report success while
 * `isActive` remains true. Prefers `archiveCategoryWithGuards` when it actually
 * writes; falls back to the client Rules write (same path as restore) when the
 * callable is unreachable, rejects admins, or returns without persisting.
 */
export async function persistCategoryArchive(
  user: User,
  categoryId: string,
  deps: PersistCategoryArchiveDeps,
): Promise<Category> {
  let guardsBlockedMessage: string | null = null;

  try {
    const result = await deps.archiveViaGuards(categoryId);
    if (result.outcome === "blocked") {
      guardsBlockedMessage = result.blockers?.[0]?.message ?? result.message;
    }
  } catch (callableError) {
    const message =
      callableError instanceof Error ? callableError.message : "Unable to archive the category.";
    // Server-side design-ref blocks must not be bypassed by the client fallback.
    if (isDesignReferenceBlockMessage(message)) {
      throw callableError instanceof Error ? callableError : new Error(message);
    }
    // Permission / unreachable callable → fall through to client persist.
  }

  if (guardsBlockedMessage) {
    throw new Error(guardsBlockedMessage);
  }

  deps.clearCaches();
  let category = await deps.getCategoryById(user, categoryId);

  if (category.isActive) {
    // Callable did not leave the document inactive — persist via client write.
    category = await deps.archiveViaClient(user, categoryId);
    deps.clearCaches();
    category = await deps.getCategoryById(user, categoryId);
  }

  if (category.isActive) {
    throw new Error("Category archive did not persist. Please try again.");
  }

  return category;
}
