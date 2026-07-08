import {
  doc,
  type DocumentData,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  startAfter,
  setDoc,
  updateDoc,
  where,
  type QueryDocumentSnapshot,
  type QueryConstraint,
} from "firebase/firestore";

import { getFirestoreErrorMessage } from "../../firebase/utils/firestoreErrorMessage";
import { assertNoUndefinedFirestoreFields, withoutUndefinedFields } from "../../firebase/utils/firestoreDocument";
import { firestoreCollectionService } from "../../firebase/services/firestoreCollectionService";
import { permissionService } from "../../permissions/services/permissionService";
import type { User } from "../../users/types/user.types";
import type {
  CatalogTag,
  CatalogTagListOptions,
  CreateCatalogTagInput,
  UpdateCatalogTagInput,
} from "../types/catalogTag.types";
import {
  assertCatalogTagAvailable,
  getCatalogTagDocumentId,
  normalizeCatalogTagInput,
  normalizeCatalogTagToken,
} from "../utils/catalogTagNormalizer";

const TAG_LIST_PAGE_SIZE = 500;

interface CatalogTagDocumentData {
  id?: unknown;
  name?: unknown;
  aliases?: unknown;
  preferredWhen?: unknown;
  status?: unknown;
  createdBy?: unknown;
  updatedBy?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
}

function isCatalogTagStatus(value: unknown): value is CatalogTag["status"] {
  return value === "approved" || value === "archived";
}

function mapCatalogTagDocument(tagId: string, data: CatalogTagDocumentData): CatalogTag {
  if (
    typeof data.name !== "string" ||
    !Array.isArray(data.aliases) ||
    typeof data.preferredWhen !== "string" ||
    !isCatalogTagStatus(data.status) ||
    !data.createdAt ||
    !data.updatedAt
  ) {
    throw new Error("A tag record is incomplete.");
  }

  return {
    id: tagId,
    name: data.name,
    aliases: data.aliases.filter((alias): alias is string => typeof alias === "string"),
    preferredWhen: data.preferredWhen,
    status: data.status,
    createdBy: typeof data.createdBy === "string" ? data.createdBy : "",
    updatedBy:
      typeof data.updatedBy === "string"
        ? data.updatedBy
        : typeof data.createdBy === "string"
          ? data.createdBy
          : "",
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

function sortCatalogTags(tags: readonly CatalogTag[]): CatalogTag[] {
  return [...tags].sort((left, right) => left.name.localeCompare(right.name));
}

function buildTagListFilterConstraints(options: CatalogTagListOptions = {}): QueryConstraint[] {
  const constraints: QueryConstraint[] = [];

  if (!options.includeArchived) {
    constraints.push(where("status", "==", "approved"));
  }

  return constraints;
}

async function listTagPage(
  options: CatalogTagListOptions,
  cursor?: QueryDocumentSnapshot<DocumentData>,
): Promise<{
  cursor?: QueryDocumentSnapshot<DocumentData>;
  tags: CatalogTag[];
}> {
  const pageConstraints: QueryConstraint[] = [
    ...buildTagListFilterConstraints(options),
  ];

  if (cursor) {
    pageConstraints.push(startAfter(cursor));
  }

  pageConstraints.push(limit(TAG_LIST_PAGE_SIZE));

  const snapshot = await getDocs(query(firestoreCollectionService.getTagsCollection(), ...pageConstraints));
  const tags = snapshot.docs.map((tagDocument) =>
    mapCatalogTagDocument(tagDocument.id, tagDocument.data()),
  );
  const nextCursor =
    snapshot.docs.length === TAG_LIST_PAGE_SIZE
      ? snapshot.docs[snapshot.docs.length - 1]
      : undefined;

  return {
    cursor: nextCursor,
    tags,
  };
}

async function listAllTags(options: CatalogTagListOptions = {}): Promise<CatalogTag[]> {
  const tags: CatalogTag[] = [];
  let cursor: QueryDocumentSnapshot<DocumentData> | undefined;

  do {
    const page = await listTagPage(options, cursor);

    tags.push(...page.tags);
    cursor = page.cursor;
  } while (cursor);

  return sortCatalogTags(tags);
}

async function getAllTags(): Promise<CatalogTag[]> {
  return listAllTags({ includeArchived: true });
}

async function readTagAfterWrite(tagId: string): Promise<CatalogTag> {
  const tagSnapshot = await getDoc(doc(firestoreCollectionService.getTagsCollection(), tagId));

  if (!tagSnapshot.exists()) {
    throw new Error("The tag record was not found.");
  }

  return mapCatalogTagDocument(tagSnapshot.id, tagSnapshot.data());
}

export const catalogTagService = {
  async bulkCreateTags(
    caller: User,
    inputs: readonly CreateCatalogTagInput[],
  ): Promise<Array<{ tag: CatalogTag } | { error: Error }>> {
    if (!permissionService.canManageTags(caller)) {
      throw new Error("You do not have permission to manage tags.");
    }

    const existingTags = await getAllTags();

    return Promise.all(
      inputs.map(async (input) => {
        try {
          const normalizedInput = normalizeCatalogTagInput(input);
          const tagId = getCatalogTagDocumentId(normalizedInput.name);
          const tagRef = doc(firestoreCollectionService.getTagsCollection(), tagId);

          assertCatalogTagAvailable(normalizedInput, existingTags);

          const tagRecord = withoutUndefinedFields({
            id: tagId,
            name: normalizedInput.name,
            aliases: normalizedInput.aliases,
            preferredWhen: normalizedInput.preferredWhen,
            status: "approved",
            createdBy: caller.id,
            updatedBy: caller.id,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          assertNoUndefinedFirestoreFields(tagRecord, "Tag create payload");
          await setDoc(tagRef, tagRecord);
          const tag = await readTagAfterWrite(tagId);
          return { tag };
        } catch (error) {
          if (error instanceof Error && /tag|alias|preferred/i.test(error.message)) {
            return { error };
          }

          return {
            error: new Error(getFirestoreErrorMessage(error, "Unable to create the tag. Please try again.")),
          };
        }
      }),
    );
  },

  async listTags(caller: User, options: CatalogTagListOptions = {}): Promise<CatalogTag[]> {
    if (!permissionService.canViewDesigns(caller)) {
      return [];
    }

    try {
      return await listAllTags(options);
    } catch (error) {
      throw new Error(getFirestoreErrorMessage(error, "Unable to load tags. Please try again."));
    }
  },

  async createTag(caller: User, input: CreateCatalogTagInput): Promise<CatalogTag> {
    if (!permissionService.canManageTags(caller)) {
      throw new Error("You do not have permission to manage tags.");
    }

    const normalizedInput = normalizeCatalogTagInput(input);
    const tagId = getCatalogTagDocumentId(normalizedInput.name);
    const tagRef = doc(firestoreCollectionService.getTagsCollection(), tagId);

    try {
      const existingTags = await getAllTags();
      assertCatalogTagAvailable(normalizedInput, existingTags);

      const tagRecord = withoutUndefinedFields({
        id: tagId,
        name: normalizedInput.name,
        aliases: normalizedInput.aliases,
        preferredWhen: normalizedInput.preferredWhen,
        status: "approved",
        createdBy: caller.id,
        updatedBy: caller.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      assertNoUndefinedFirestoreFields(tagRecord, "Tag create payload");
      await setDoc(tagRef, tagRecord);
      return await readTagAfterWrite(tagId);
    } catch (error) {
      if (error instanceof Error && /tag|alias|preferred/i.test(error.message)) {
        throw error;
      }

      throw new Error(getFirestoreErrorMessage(error, "Unable to create the tag. Please try again."));
    }
  },

  async updateTag(caller: User, tagId: string, input: UpdateCatalogTagInput): Promise<CatalogTag> {
    if (!permissionService.canManageTags(caller)) {
      throw new Error("You do not have permission to manage tags.");
    }

    if (Object.keys(input).length === 0) {
      throw new Error("No tag changes were provided.");
    }

    try {
      const existingTags = await getAllTags();
      const existingTag = existingTags.find((tag) => tag.id === tagId);

      if (!existingTag) {
        throw new Error("The tag record was not found.");
      }

      const normalizedInput = normalizeCatalogTagInput({
        name: input.name ?? existingTag.name,
        aliases: input.aliases ?? existingTag.aliases,
        preferredWhen: input.preferredWhen ?? existingTag.preferredWhen,
      });

      assertCatalogTagAvailable(normalizedInput, existingTags, tagId);

      const updatePayload = withoutUndefinedFields({
        name: normalizedInput.name,
        aliases: normalizedInput.aliases,
        preferredWhen: normalizedInput.preferredWhen,
        status: input.status ?? existingTag.status,
        updatedAt: serverTimestamp(),
        updatedBy: caller.id,
      });

      assertNoUndefinedFirestoreFields(updatePayload, "Tag update payload");
      await updateDoc(doc(firestoreCollectionService.getTagsCollection(), tagId), updatePayload);
      return await readTagAfterWrite(tagId);
    } catch (error) {
      if (error instanceof Error && /tag|alias|preferred|changes/.test(error.message.toLowerCase())) {
        throw error;
      }

      throw new Error(getFirestoreErrorMessage(error, "Unable to update the tag. Please try again."));
    }
  },

  async archiveTag(caller: User, tagId: string): Promise<CatalogTag> {
    return this.updateTag(caller, tagId, { status: "archived" });
  },

  async approveSuggestedTag(caller: User, input: CreateCatalogTagInput): Promise<CatalogTag> {
    if (!permissionService.canApproveSuggestedTags(caller)) {
      throw new Error("You do not have permission to approve suggested tags.");
    }

    return this.createTag(caller, {
      name: normalizeCatalogTagToken(input.name, "Tag name"),
      aliases: input.aliases,
      preferredWhen: input.preferredWhen,
    });
  },
};
