import {
  deleteField,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type QueryConstraint,
} from "firebase/firestore";

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

function mapCategoryDocument(categoryId: string, data: CategoryDocumentData): Category {
  if (
    typeof data.name !== "string" ||
    typeof data.sortOrder !== "number" ||
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
    sortOrder: data.sortOrder,
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

function sortCategories(categories: Category[]): Category[] {
  return [...categories].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }

    return left.name.localeCompare(right.name);
  });
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

const RESTORE_CATEGORY_NAME_CONFLICT_MESSAGE =
  "A category with this name is already active. Rename this archived category before restoring it.";

async function assertActiveCategoryNameAvailable(
  name: string,
  excludeCategoryId?: string,
  conflictMessage = "An active category with this name already exists.",
): Promise<void> {
  const normalizedName = normalizeCategoryNameForComparison(name);

  const categoriesQuery = query(
    firestoreCollectionService.getCategoriesCollection(),
    where("isActive", "==", true),
    orderBy("sortOrder", "asc"),
    limit(DEFAULT_CATEGORY_LIST_LIMIT),
  );
  const snapshot = await getDocs(categoriesQuery);

  const hasConflict = snapshot.docs.some((categoryDocument) => {
    if (categoryDocument.id === excludeCategoryId) {
      return false;
    }

    const data = categoryDocument.data();

    if (typeof data.name !== "string") {
      return false;
    }

    try {
      return normalizeCategoryNameForComparison(data.name) === normalizedName;
    } catch {
      return false;
    }
  });

  if (hasConflict) {
    throw new Error(conflictMessage);
  }
}

function buildCategoryListConstraints(options: CategoryListOptions = {}): QueryConstraint[] {
  const constraints: QueryConstraint[] = [];

  if (!options.includeInactive) {
    constraints.push(where("isActive", "==", true));
  }

  constraints.push(orderBy("sortOrder", "asc"));
  constraints.push(limit(DEFAULT_CATEGORY_LIST_LIMIT));

  return constraints;
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

      return sortCategories(
        snapshot.docs.map((categoryDocument) =>
          mapCategoryDocument(categoryDocument.id, categoryDocument.data()),
        ),
      );
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

    try {
      await assertActiveCategoryNameAvailable(name);

      const categoriesCollection = firestoreCollectionService.getCategoriesCollection();
      const categoryRef = input.id ? doc(categoriesCollection, input.id) : doc(categoriesCollection);
      const categoryId = categoryRef.id;

      const categoryRecord = withoutUndefinedFields({
        id: categoryId,
        name,
        description: input.description?.trim() || undefined,
        sortOrder: input.sortOrder ?? 0,
        isActive: input.isActive ?? true,
        createdBy: caller.id,
        updatedBy: caller.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await setDoc(categoryRef, categoryRecord);
      const createdSnapshot = await getDoc(categoryRef);

      if (!createdSnapshot.exists()) {
        throw new Error("The category record could not be created.");
      }

      return mapCategoryDocument(createdSnapshot.id, createdSnapshot.data());
    } catch (error) {
      if (error instanceof Error && error.message.includes("category")) {
        throw error;
      }

      throw new Error(getFirestoreErrorMessage(error, "Unable to create the category. Please try again."));
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

    const updatePayload: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
      updatedBy: caller.id,
    };

    if (input.name !== undefined) {
      const name = validateCategoryName(input.name);
      await assertActiveCategoryNameAvailable(name, categoryId);
      updatePayload.name = name;
    }

    if (input.description !== undefined) {
      updatePayload.description = input.description.trim() ? input.description.trim() : deleteField();
    }

    if (input.sortOrder !== undefined) {
      updatePayload.sortOrder = input.sortOrder;
    }

    if (input.isActive !== undefined) {
      updatePayload.isActive = input.isActive;
    }

    try {
      const categoryRef = doc(firestoreCollectionService.getCategoriesCollection(), categoryId);
      const existingSnapshot = await getDoc(categoryRef);

      if (!existingSnapshot.exists()) {
        throw new Error("The category record was not found.");
      }

      const existingData = existingSnapshot.data();

      if (typeof existingData.createdBy !== "string") {
        updatePayload.createdBy = caller.id;
      }

      assertNoUndefinedFirestoreFields(updatePayload, "Category update payload");
      await updateDoc(categoryRef, updatePayload);
      const updatedSnapshot = await getDoc(categoryRef);

      if (!updatedSnapshot.exists()) {
        throw new Error("The category record was not found.");
      }

      return mapCategoryDocument(updatedSnapshot.id, updatedSnapshot.data());
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

      await assertActiveCategoryNameAvailable(
        category.name,
        categoryId,
        RESTORE_CATEGORY_NAME_CONFLICT_MESSAGE,
      );

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
