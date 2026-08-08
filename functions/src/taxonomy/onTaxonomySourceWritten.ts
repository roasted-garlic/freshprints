import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { onCall } from "firebase-functions/v2/https";

import { assertStaffCaller, loadCallerProfile } from "../lib/caller";
import { permissionDenied, unauthenticated } from "../lib/errors";
import { rebuildTaxonomyMaterialization } from "./rebuildTaxonomyMaterialization";
import { createTaxonomyTriggerCoalesce } from "./taxonomyTriggerCoalesce";

/**
 * Process-local awaited coalesce for taxonomy source triggers (Option A).
 * Multi-instance may still rebuild more than once (accepted residual; no fleet lock).
 */
const taxonomyTriggerCoalesce = createTaxonomyTriggerCoalesce({
  rebuild: (input) => rebuildTaxonomyMaterialization(input),
});

/** Production entry used by tag/category triggers (also containment-tested). */
export async function awaitTaxonomySourceRebuild(reason: string): Promise<void> {
  await taxonomyTriggerCoalesce.awaitCoalescedTaxonomyRebuild(reason);
}

function taxonomyFieldsChanged(
  before: Record<string, unknown> | undefined,
  after: Record<string, unknown> | undefined,
): boolean {
  if (!before && after) return true;
  if (before && !after) return true;
  if (!before || !after) return false;
  const keys = [
    "name",
    "aliases",
    "preferredWhen",
    "status",
    "isActive",
    "description",
    "sortOrder",
  ];
  return keys.some((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
}

/** RC1: every tag write reaches shared rebuild (covers Studio client SDK mutations). */
export const onTagTaxonomySourceWritten = onDocumentWritten("tags/{tagId}", async (event) => {
  const before = event.data?.before?.exists
    ? (event.data.before.data() as Record<string, unknown>)
    : undefined;
  const after = event.data?.after?.exists
    ? (event.data.after.data() as Record<string, unknown>)
    : undefined;
  if (!taxonomyFieldsChanged(before, after)) {
    return;
  }
  await awaitTaxonomySourceRebuild("tag-written");
});

/** RC1: every category write reaches shared rebuild. */
export const onCategoryTaxonomySourceWritten = onDocumentWritten(
  "categories/{categoryId}",
  async (event) => {
    const before = event.data?.before?.exists
      ? (event.data.before.data() as Record<string, unknown>)
      : undefined;
    const after = event.data?.after?.exists
      ? (event.data.after.data() as Record<string, unknown>)
      : undefined;
    if (!taxonomyFieldsChanged(before, after)) {
      return;
    }
    await awaitTaxonomySourceRebuild("category-written");
  },
);

/**
 * Owner/admin bootstrap or repair callable.
 */
export const rebuildTaxonomyMaterializationCallable = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw unauthenticated();
  }
  const caller = await loadCallerProfile(request.auth.uid);
  assertStaffCaller(caller);
  if (!caller.isActive || !["owner", "admin"].includes(caller.role)) {
    throw permissionDenied("Only owners and admins can rebuild taxonomy materialization.");
  }
  const built = await rebuildTaxonomyMaterialization({
    updatedBy: request.auth.uid,
    reason: "callable-rebuild",
  });
  return {
    revision: built.revision,
    chunkCount: built.chunkCount,
    tagCount: built.tagCount,
    categoryCount: built.categoryCount,
    contentHash: built.contentHash,
    corpusBytes: built.corpusBytes,
  };
});
