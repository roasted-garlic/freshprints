import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

import type {
  ArchiveCategoryWithGuardsRequest,
  ArchiveCategoryWithGuardsResponse,
  ArchiveTagWithGuardsRequest,
  ArchiveTagWithGuardsResponse,
  PreviewCategoryArchiveRequest,
  PreviewCategoryArchiveResponse,
  PreviewTagArchiveRequest,
  PreviewTagArchiveResponse,
} from "../../packages/shared/src/types/deletion/deletion.types";
import { adminDb } from "./lib/admin";
import { loadCallerProfile } from "./lib/caller";
import {
  failedPrecondition,
  invalidArgument,
  permissionDenied,
  unauthenticated,
} from "./lib/errors";

function assertOwnerAdmin(caller: Awaited<ReturnType<typeof loadCallerProfile>>): void {
  // Matches Firestore Rules `isOwnerOrAdmin` and Studio `canManageCategories` /
  // `canManageTags`. Prior owner-only check rejected admins who can open the
  // archive UI — source fix for the next Functions deploy (not deployed in
  // Amendment 2; Studio client persist is the live path).
  if (!caller.isActive || (caller.role !== "owner" && caller.role !== "admin")) {
    throw permissionDenied("Only owners and admins can archive categories and tags.");
  }
}

function mapHttpsError(error: unknown): never {
  if (error instanceof HttpsError) {
    throw error;
  }
  if (error instanceof Error) {
    throw invalidArgument(error.message);
  }
  throw failedPrecondition("Unable to archive taxonomy right now.");
}

function parseId(data: unknown, field: "categoryId" | "tagId"): string {
  if (!data || typeof data !== "object") {
    throw invalidArgument("Request data is required.");
  }
  const record = data as Record<string, unknown>;
  const value = typeof record[field] === "string" ? record[field].trim() : "";
  if (!value) {
    throw invalidArgument(`Select a ${field === "categoryId" ? "category" : "tag"}.`);
  }
  return value;
}

async function countDesignsByCategory(categoryId: string): Promise<number> {
  const snapshot = await adminDb
    .collection("designs")
    .where("categoryId", "==", categoryId)
    .select()
    .get();
  return snapshot.size;
}

async function countDesignsByTag(tagId: string): Promise<number> {
  const snapshot = await adminDb
    .collection("designs")
    .where("tags", "array-contains", tagId)
    .select()
    .get();
  return snapshot.size;
}

export const previewCategoryArchive = onCall(
  async (request): Promise<PreviewCategoryArchiveResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }
    try {
      const caller = await loadCallerProfile(request.auth.uid);
      assertOwnerAdmin(caller);
      const categoryId = parseId(request.data as PreviewCategoryArchiveRequest, "categoryId");
      const snap = await adminDb.collection("categories").doc(categoryId).get();
      if (!snap.exists) {
        throw invalidArgument("Category not found.");
      }
      const name =
        typeof snap.data()?.name === "string" && snap.data()?.name.trim()
          ? snap.data()!.name.trim()
          : "Category";
      const referencingDesignCount = await countDesignsByCategory(categoryId);

      if (snap.data()?.isActive === false) {
        return {
          outcome: "already_done",
          blockers: [],
          entityLabel: name,
          notes: ["This category is already archived."],
          categoryId,
          categoryName: name,
          referencingDesignCount,
        };
      }

      if (referencingDesignCount > 0) {
        return {
          outcome: "blocked",
          blockers: [
            {
              code: "category_referenced_by_designs",
              message: `This category cannot be archived while ${referencingDesignCount} design(s) still use it. Reassign those designs first.`,
              count: referencingDesignCount,
              navigateHint: "Design Library",
            },
          ],
          entityLabel: name,
          categoryId,
          categoryName: name,
          referencingDesignCount,
        };
      }

      return {
        outcome: "archive",
        blockers: [],
        entityLabel: name,
        confirmLabel: "Archive category",
        categoryId,
        categoryName: name,
        referencingDesignCount: 0,
      };
    } catch (error) {
      mapHttpsError(error);
    }
  },
);

export const archiveCategoryWithGuards = onCall(
  async (request): Promise<ArchiveCategoryWithGuardsResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }
    try {
      const caller = await loadCallerProfile(request.auth.uid);
      assertOwnerAdmin(caller);
      const categoryId = parseId(request.data as ArchiveCategoryWithGuardsRequest, "categoryId");

      const snap = await adminDb.collection("categories").doc(categoryId).get();
      if (!snap.exists) {
        throw invalidArgument("Category not found.");
      }
      if (snap.data()?.isActive === false) {
        return {
          outcome: "already_done",
          message: "Category already archived.",
          entityId: categoryId,
          categoryId,
        };
      }

      const referencingDesignCount = await countDesignsByCategory(categoryId);
      if (referencingDesignCount > 0) {
        return {
          outcome: "blocked",
          blockers: [
            {
              code: "category_referenced_by_designs",
              message: `This category cannot be archived while ${referencingDesignCount} design(s) still use it. Reassign those designs first.`,
              count: referencingDesignCount,
              navigateHint: "Design Library",
            },
          ],
          message: `This category cannot be archived while ${referencingDesignCount} design(s) still use it.`,
          entityId: categoryId,
          categoryId,
        };
      }

      await adminDb.collection("categories").doc(categoryId).set(
        {
          isActive: false,
          updatedAt: FieldValue.serverTimestamp(),
          updatedBy: request.auth.uid,
        },
        { merge: true },
      );

      return {
        outcome: "archive",
        message: "Category archived.",
        entityId: categoryId,
        categoryId,
      };
    } catch (error) {
      mapHttpsError(error);
    }
  },
);

export const previewTagArchive = onCall(async (request): Promise<PreviewTagArchiveResponse> => {
  if (!request.auth?.uid) {
    throw unauthenticated();
  }
  try {
    const caller = await loadCallerProfile(request.auth.uid);
    assertOwnerAdmin(caller);
    const tagId = parseId(request.data as PreviewTagArchiveRequest, "tagId");
    const snap = await adminDb.collection("tags").doc(tagId).get();
    if (!snap.exists) {
      throw invalidArgument("Tag not found.");
    }
    const name =
      typeof snap.data()?.name === "string" && snap.data()?.name.trim()
        ? snap.data()!.name.trim()
        : "Tag";
    const referencingDesignCount = await countDesignsByTag(tagId);

    if (snap.data()?.status === "archived") {
      return {
        outcome: "already_done",
        blockers: [],
        entityLabel: name,
        notes: ["This tag is already archived."],
        tagId,
        tagName: name,
        referencingDesignCount,
      };
    }

    if (referencingDesignCount > 0) {
      return {
        outcome: "blocked",
        blockers: [
          {
            code: "tag_referenced_by_designs",
            message: `This tag cannot be archived while ${referencingDesignCount} design(s) still use it. Remove the tag from those designs first.`,
            count: referencingDesignCount,
            navigateHint: "Design Library",
          },
        ],
        entityLabel: name,
        tagId,
        tagName: name,
        referencingDesignCount,
      };
    }

    return {
      outcome: "archive",
      blockers: [],
      entityLabel: name,
      confirmLabel: "Archive tag",
      tagId,
      tagName: name,
      referencingDesignCount: 0,
    };
  } catch (error) {
    mapHttpsError(error);
  }
});

export const archiveTagWithGuards = onCall(
  async (request): Promise<ArchiveTagWithGuardsResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }
    try {
      const caller = await loadCallerProfile(request.auth.uid);
      assertOwnerAdmin(caller);
      const tagId = parseId(request.data as ArchiveTagWithGuardsRequest, "tagId");

      const snap = await adminDb.collection("tags").doc(tagId).get();
      if (!snap.exists) {
        throw invalidArgument("Tag not found.");
      }
      if (snap.data()?.status === "archived") {
        return {
          outcome: "already_done",
          message: "Tag already archived.",
          entityId: tagId,
          tagId,
        };
      }

      const referencingDesignCount = await countDesignsByTag(tagId);
      if (referencingDesignCount > 0) {
        return {
          outcome: "blocked",
          blockers: [
            {
              code: "tag_referenced_by_designs",
              message: `This tag cannot be archived while ${referencingDesignCount} design(s) still use it. Remove the tag from those designs first.`,
              count: referencingDesignCount,
              navigateHint: "Design Library",
            },
          ],
          message: `This tag cannot be archived while ${referencingDesignCount} design(s) still use it.`,
          entityId: tagId,
          tagId,
        };
      }

      await adminDb.collection("tags").doc(tagId).set(
        {
          status: "archived",
          updatedAt: FieldValue.serverTimestamp(),
          updatedBy: request.auth.uid,
        },
        { merge: true },
      );

      return {
        outcome: "archive",
        message: "Tag archived.",
        entityId: tagId,
        tagId,
      };
    } catch (error) {
      mapHttpsError(error);
    }
  },
);
