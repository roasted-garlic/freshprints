import {
  deleteField,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  where,
  type QueryConstraint,
  writeBatch,
} from "firebase/firestore";

import { db } from "../../../config/firebase";
import { getFirestoreErrorMessage } from "../../firebase/utils/firestoreErrorMessage";
import { assertNoUndefinedFirestoreFields, withoutUndefinedFields } from "../../firebase/utils/firestoreDocument";
import { firestoreCollectionService } from "../../firebase/services/firestoreCollectionService";
import { permissionService } from "../../permissions/services/permissionService";
import type { User } from "../../users/types/user.types";
import type {
  Category,
  CategoryListOptions,
  CreateCategoryInput,
  UpdateCategoryInput,
} from "../types/category.types";
import {
  buildCategoryOrderUpdates,
  compareCategoryOrder,
  moveCategoryToOrder,
  normalizeCategoryOrder,
} from "../utils/categoryOrder";

const MAX_CATEGORY_NAME_LENGTH = 80;
const DEFAULT_CATEGORY_LIST_LIMIT = 200;

interface CategoryDocumentData {
  id?: unknown;
  name?: unknown;
  description?: unknown;
  sortOrder?: unknown;
  isActive?: unknown;
  createdBy?: unknown;
  updatedBy?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
}

function isValidPersistedSortOrder(sortOrder: unknown): sortOrder is number {
  return typeof sortOrder === "number" && Number.isInteger(sortOrder) && sortOrder >= 0;
}

function mapCategoryDocument(categoryId: string, data: CategoryDocumentData): Category {
  if (
    typeof data.name !== "string" ||
    typeof data.isActive !== "boolean" ||
    !data.createdAt ||
    !data.updatedAt
  ) {
    throw new Error("A category record is incomplete.");
  }

  return {
    id: categoryId,
    name: data.name,
    description: typeof data.description === "string" ? data.description : undefined,
    sortOrder: isValidPersistedSortOrder(data.sortOrder) ? data.sortOrder : 0,
    isActive: data.isActive,
    createdBy: typeof data.createdBy === "string" ? data.createdBy : "",
    updatedBy:
      typeof data.updatedBy === "string"
        ? data.updatedBy
        : typeof data.createdBy === "string"
          ? data.createdBy
          : "",
    createdAt: data.createdAt as Category["createdAt"],
    updatedAt: data.updatedAt as Category["updatedAt"],
  };
}

function sortCategories(categories: readonly Category[]): Category[] {
  return [...categories].sort(compareCategoryOrder);
}

function normalizeCategoriesForRead(categories: readonly Category[]): Category[] {
  const activeCategories = normalizeCategoryOrder(categories.filter((category) => category.isActive));
  const inactiveCategories = sortCategories(categories.filter((category) => !category.isActive));

  return [...activeCategories, ...inactiveCategories];
}

function validateCategoryName(name: string): string {
  const trimmedName = name.trim();

  if (!trimmedName) {
    throw new Error("A category name is required.");
  }

  if (trimmedName.length > MAX_CATEGORY_NAME_LENGTH) {
    throw new Error(`Category names must be ${MAX_CATEGORY_NAME_LENGTH} characters or fewer.`);
  }

  return trimmedName;
}

function normalizeCategoryNameForComparison(name: string): string {
  return validateCategoryName(name).toLowerCase();
}

function normalizeCategoryDescription(description: string | undefined): string | undefined {
  return description?.trim() ? description.trim() : undefined;
}

function isCategoryNameConflict(
  categories: readonly Category[],
  candidateName: string,
  excludeCategoryId?: string,
): boolean {
  const normalizedName = normalizeCategoryNameForComparison(candidateName);

  return categories.some((category) => {
    if (!category.isActive || category.id === excludeCategoryId) {
      return false;
    }

    try {
      return normalizeCategoryNameForComparison(category.name) === normalizedName;
    } catch {
      return false;
    }
  });
}

const RESTORE_CATEGORY_NAME_CONFLICT_MESSAGE =
  "A category with this name is already active. Rename this archived category before restoring it.";

function assertActiveCategoryNameAvailableInCategories(
  categories: readonly Category[],
  name: string,
  excludeCategoryId?: string,
  conflictMessage = "An active category with this name already exists.",
): void {
  if (isCategoryNameConflict(categories, name, excludeCategoryId)) {
    throw new Error(conflictMessage);
  }
}

function buildCategoryListConstraints(options: CategoryListOptions = {}): QueryConstraint[] {
  const constraints: QueryConstraint[] = [];

  if (!options.includeInactive) {
    constraints.push(where("isActive", "==", true));
  }

  constraints.push(limit(DEFAULT_CATEGORY_LIST_LIMIT));

  return constraints;
}

function getExistingCategoryDocumentData(
  categoryDocumentsById: Map<string, CategoryDocumentData>,
  categoryId: string,
): CategoryDocumentData {
  return categoryDocumentsById.get(categoryId) ?? {};
}

function mergeCategoryTransactionPayload(
  payloadById: Map<string, Record<string, unknown>>,
  categoryDocumentsById: Map<string, CategoryDocumentData>,
  categoryId: string,
  callerId: string,
  partialPayload: Record<string, unknown>,
): void {
  const nextPayload: Record<string, unknown> = {
    ...(payloadById.get(categoryId) ?? {}),
    ...partialPayload,
    updatedAt: serverTimestamp(),
    updatedBy: callerId,
  };

  const existingData = getExistingCategoryDocumentData(categoryDocumentsById, categoryId);

  if (typeof existingData.createdBy !== "string") {
    nextPayload.createdBy = callerId;
  }

  assertNoUndefinedFirestoreFields(nextPayload, "Category update payload");
  payloadById.set(categoryId, nextPayload);
}

function applyCategoryOrderUpdates(
  payloadById: Map<string, Record<string, unknown>>,
  categoryDocumentsById: Map<string, CategoryDocumentData>,
  previousCategories: readonly Category[],
  nextCategories: readonly Category[],
  callerId: string,
): void {
  const orderUpdates = buildCategoryOrderUpdates(previousCategories, nextCategories);

  orderUpdates.forEach((orderUpdate) => {
    mergeCategoryTransactionPayload(payloadById, categoryDocumentsById, orderUpdate.id, callerId, {
      sortOrder: orderUpdate.sortOrder,
    });
  });
}

function buildActiveCategoryResult(
  activeCategories: readonly Category[],
  categoryId: string,
): Category {
  const category = activeCategories.find((activeCategory) => activeCategory.id === categoryId);

  if (!category) {
    throw new Error("The category record was not found.");
  }

  return category;
}

async function getAllCategories(): Promise<{
  allCategories: Category[];
  categoryDocumentsById: Map<string, CategoryDocumentData>;
}> {
  const categoriesCollection = firestoreCollectionService.getCategoriesCollection();
  const categoriesSnapshot = await getDocs(query(categoriesCollection));
  const categoryDocumentsById = new Map<string, CategoryDocumentData>();

  const allCategories = categoriesSnapshot.docs.map((categoryDocument) => {
    const data = categoryDocument.data();
    categoryDocumentsById.set(categoryDocument.id, data);

    return mapCategoryDocument(categoryDocument.id, data);
  });

  return {
    allCategories,
    categoryDocumentsById,
  };
}

async function commitCategoryPayloads(
  payloadById: Map<string, Record<string, unknown>>,
): Promise<void> {
  if (payloadById.size === 0) {
    return;
  }

  const batch = writeBatch(db);

  payloadById.forEach((payload, categoryId) => {
    batch.update(doc(firestoreCollectionService.getCategoriesCollection(), categoryId), payload);
  });

  await batch.commit();
}

async function readCategoryAfterWrite(categoryId: string): Promise<Category> {
  const categoryRef = doc(firestoreCollectionService.getCategoriesCollection(), categoryId);
  const categorySnapshot = await getDoc(categoryRef);

  if (!categorySnapshot.exists()) {
    throw new Error("The category record was not found.");
  }

  return mapCategoryDocument(categorySnapshot.id, categorySnapshot.data());
}

export const categoryService = {
  async listCategories(caller: User, options: CategoryListOptions = {}): Promise<Category[]> {
    if (!permissionService.canViewDesigns(caller)) {
      return [];
    }

    try {
      const categoriesQuery = query(
        firestoreCollectionService.getCategoriesCollection(),
        ...buildCategoryListConstraints(options),
      );
      const snapshot = await getDocs(categoriesQuery);

      const categories = snapshot.docs.map((categoryDocument) =>
        mapCategoryDocument(categoryDocument.id, categoryDocument.data()),
      );

      return normalizeCategoriesForRead(categories);
    } catch (error) {
      throw new Error(getFirestoreErrorMessage(error, "Unable to load categories. Please try again."));
    }
  },

  async getCategoryById(caller: User, categoryId: string): Promise<Category> {
    if (!permissionService.canViewDesigns(caller)) {
      throw new Error("You do not have permission to view categories.");
    }

    try {
      const categorySnapshot = await getDoc(
        doc(firestoreCollectionService.getCategoriesCollection(), categoryId),
      );

      if (!categorySnapshot.exists()) {
        throw new Error("The requested category was not found.");
      }

      return mapCategoryDocument(categorySnapshot.id, categorySnapshot.data());
    } catch (error) {
      if (error instanceof Error && error.message === "The requested category was not found.") {
        throw error;
      }

      throw new Error(
        getFirestoreErrorMessage(error, "Unable to load the category. Please try again."),
      );
    }
  },

  async createCategory(caller: User, input: CreateCategoryInput): Promise<Category> {
    if (!permissionService.canManageCategories(caller)) {
      throw new Error("You do not have permission to manage categories.");
    }

    const name = validateCategoryName(input.name);
    const description = normalizeCategoryDescription(input.description);
    const isActive = input.isActive ?? true;
    const categoriesCollection = firestoreCollectionService.getCategoriesCollection();
    const categoryRef = input.id ? doc(categoriesCollection, input.id) : doc(categoriesCollection);
    const categoryId = categoryRef.id;

    try {
      const { allCategories, categoryDocumentsById } = await getAllCategories();
      assertActiveCategoryNameAvailableInCategories(allCategories, name);

      const payloadById = new Map<string, Record<string, unknown>>();
      const activeCategories = allCategories.filter((category) => category.isActive);
      const normalizedActiveCategories = normalizeCategoryOrder(activeCategories);

      applyCategoryOrderUpdates(
        payloadById,
        categoryDocumentsById,
        activeCategories,
        normalizedActiveCategories,
        caller.id,
      );

      const batch = writeBatch(db);
      payloadById.forEach((payload, targetCategoryId) => {
        batch.update(doc(categoriesCollection, targetCategoryId), payload);
      });

      const nextSortOrder = isActive ? normalizedActiveCategories.length : activeCategories.length;
      const categoryRecord = withoutUndefinedFields({
        id: categoryId,
        name,
        description,
        sortOrder: nextSortOrder,
        isActive,
        createdBy: caller.id,
        updatedBy: caller.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      batch.set(categoryRef, categoryRecord);
      await batch.commit();

      return await readCategoryAfterWrite(categoryId);
    } catch (error) {
      if (error instanceof Error && error.message.includes("category")) {
        throw error;
      }

      throw new Error(getFirestoreErrorMessage(error, "Unable to create the category. Please try again."));
    }
  },

  async reorderCategory(caller: User, categoryId: string, targetOrder: number): Promise<Category> {
    if (!permissionService.canManageCategories(caller)) {
      throw new Error("You do not have permission to manage categories.");
    }

    try {
      const { allCategories, categoryDocumentsById } = await getAllCategories();
      const targetCategory = allCategories.find((category) => category.id === categoryId);

      if (!targetCategory) {
        throw new Error("The category record was not found.");
      }

      if (!targetCategory.isActive) {
        throw new Error("Archived categories cannot be reordered until they are restored.");
      }

      const activeCategories = allCategories.filter((category) => category.isActive);
      const reorderedActiveCategories = moveCategoryToOrder(activeCategories, categoryId, targetOrder);
      const payloadById = new Map<string, Record<string, unknown>>();

      applyCategoryOrderUpdates(
        payloadById,
        categoryDocumentsById,
        activeCategories,
        reorderedActiveCategories,
        caller.id,
      );

      await commitCategoryPayloads(payloadById);

      return await readCategoryAfterWrite(categoryId);
    } catch (error) {
      if (error instanceof Error && error.message.includes("category")) {
        throw error;
      }

      throw new Error(getFirestoreErrorMessage(error, "Unable to reorder the category. Please try again."));
    }
  },

  async updateCategory(
    caller: User,
    categoryId: string,
    input: UpdateCategoryInput,
  ): Promise<Category> {
    if (!permissionService.canManageCategories(caller)) {
      throw new Error("You do not have permission to manage categories.");
    }

    if (Object.keys(input).length === 0) {
      throw new Error("No category changes were provided.");
    }

    const nextName = input.name !== undefined ? validateCategoryName(input.name) : undefined;
    const nextDescription =
      input.description !== undefined ? normalizeCategoryDescription(input.description) : undefined;

    try {
      const { allCategories, categoryDocumentsById } = await getAllCategories();
      const existingCategory = allCategories.find((category) => category.id === categoryId);

      if (!existingCategory) {
        throw new Error("The category record was not found.");
      }

      const resolvedName = nextName ?? existingCategory.name;
      const resolvedDescription =
        input.description !== undefined ? nextDescription : existingCategory.description;
      const resolvedIsActive = input.isActive ?? existingCategory.isActive;
      const payloadById = new Map<string, Record<string, unknown>>();
      const activeCategories = allCategories.filter((category) => category.isActive);

      if (resolvedIsActive) {
        assertActiveCategoryNameAvailableInCategories(
          allCategories,
          resolvedName,
          categoryId,
          existingCategory.isActive ? undefined : RESTORE_CATEGORY_NAME_CONFLICT_MESSAGE,
        );
      }

      if (existingCategory.isActive && resolvedIsActive) {
        const normalizedActiveCategories =
          input.sortOrder !== undefined
            ? moveCategoryToOrder(activeCategories, categoryId, input.sortOrder)
            : normalizeCategoryOrder(activeCategories);
        applyCategoryOrderUpdates(
          payloadById,
          categoryDocumentsById,
          activeCategories,
          normalizedActiveCategories,
          caller.id,
        );

        const updatedCategory = buildActiveCategoryResult(normalizedActiveCategories, categoryId);
        mergeCategoryTransactionPayload(payloadById, categoryDocumentsById, categoryId, caller.id, {
          name: resolvedName,
          description: resolvedDescription ?? deleteField(),
          isActive: true,
          sortOrder: updatedCategory.sortOrder,
        });
      } else if (existingCategory.isActive && !resolvedIsActive) {
        const remainingActiveCategories = normalizeCategoryOrder(
          activeCategories.filter((category) => category.id !== categoryId),
        );

        applyCategoryOrderUpdates(
          payloadById,
          categoryDocumentsById,
          activeCategories.filter((category) => category.id !== categoryId),
          remainingActiveCategories,
          caller.id,
        );

        mergeCategoryTransactionPayload(payloadById, categoryDocumentsById, categoryId, caller.id, {
          name: resolvedName,
          description: resolvedDescription ?? deleteField(),
          isActive: false,
        });
      } else if (!existingCategory.isActive && resolvedIsActive) {
        const normalizedActiveCategories = normalizeCategoryOrder(activeCategories);
        applyCategoryOrderUpdates(
          payloadById,
          categoryDocumentsById,
          activeCategories,
          normalizedActiveCategories,
          caller.id,
        );

        mergeCategoryTransactionPayload(payloadById, categoryDocumentsById, categoryId, caller.id, {
          name: resolvedName,
          description: resolvedDescription ?? deleteField(),
          isActive: true,
          sortOrder: normalizedActiveCategories.length,
        });
      } else {
        const payload: Record<string, unknown> = {
          name: resolvedName,
          isActive: false,
        };

        if (input.description !== undefined) {
          payload.description = resolvedDescription ?? deleteField();
        }

        if (input.sortOrder !== undefined) {
          payload.sortOrder = Math.max(0, Math.trunc(input.sortOrder));
        }

        mergeCategoryTransactionPayload(payloadById, categoryDocumentsById, categoryId, caller.id, payload);
      }

      await commitCategoryPayloads(payloadById);

      return await readCategoryAfterWrite(categoryId);
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes("category") ||
          error.message.includes("permission") ||
          error.message.includes("changes were provided"))
      ) {
        throw error;
      }

      throw new Error(getFirestoreErrorMessage(error, "Unable to update the category. Please try again."));
    }
  },

  async archiveCategory(caller: User, categoryId: string): Promise<Category> {
    if (!permissionService.canManageCategories(caller)) {
      throw new Error("You do not have permission to manage categories.");
    }

    return this.updateCategory(caller, categoryId, { isActive: false });
  },

  async restoreCategory(caller: User, categoryId: string): Promise<Category> {
    if (!permissionService.canManageCategories(caller)) {
      throw new Error("You do not have permission to manage categories.");
    }

    try {
      const category = await this.getCategoryById(caller, categoryId);

      if (category.isActive) {
        return category;
      }

      return this.updateCategory(caller, categoryId, { isActive: true });
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes("category") ||
          error.message.includes("permission") ||
          error.message === RESTORE_CATEGORY_NAME_CONFLICT_MESSAGE)
      ) {
        throw error;
      }

      throw new Error(getFirestoreErrorMessage(error, "Unable to restore the category. Please try again."));
    }
  },
};
