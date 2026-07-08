import type { Category } from "../types/category.types";

export interface CategoryOrderItem {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
}

export type CategoryDropPosition = "before" | "after";

function normalizeComparableSortOrder(sortOrder: number): number {
  if (!Number.isInteger(sortOrder) || sortOrder < 0) {
    return Number.MAX_SAFE_INTEGER;
  }

  return sortOrder;
}

export function compareCategoryOrder<T extends CategoryOrderItem>(left: T, right: T): number {
  const leftOrder = normalizeComparableSortOrder(left.sortOrder);
  const rightOrder = normalizeComparableSortOrder(right.sortOrder);

  if (leftOrder !== rightOrder) {
    return leftOrder - rightOrder;
  }

  const nameComparison = left.name.localeCompare(right.name, undefined, { sensitivity: "base" });

  if (nameComparison !== 0) {
    return nameComparison;
  }

  return left.id.localeCompare(right.id);
}

export function normalizeCategoryOrder<T extends CategoryOrderItem>(categories: readonly T[]): T[] {
  return [...categories]
    .sort(compareCategoryOrder)
    .map((category, index) => ({
      ...category,
      sortOrder: index,
    }));
}

export function moveCategoryToOrder<T extends CategoryOrderItem>(
  categories: readonly T[],
  categoryId: string,
  targetOrder: number,
): T[] {
  const normalizedCategories = normalizeCategoryOrder(categories);
  const sourceIndex = normalizedCategories.findIndex((category) => category.id === categoryId);

  if (sourceIndex === -1) {
    throw new Error("The selected category could not be found.");
  }

  const [movedCategory] = normalizedCategories.splice(sourceIndex, 1);

  if (!movedCategory) {
    throw new Error("The selected category could not be moved.");
  }

  const clampedTargetOrder = Math.max(0, Math.min(Math.trunc(targetOrder), normalizedCategories.length));
  normalizedCategories.splice(clampedTargetOrder, 0, movedCategory);

  return normalizedCategories.map((category, index) => ({
    ...category,
    sortOrder: index,
  }));
}

export function moveCategoryRelative<T extends CategoryOrderItem>(
  categories: readonly T[],
  categoryId: string,
  targetCategoryId: string,
  position: CategoryDropPosition,
): T[] {
  if (categoryId === targetCategoryId) {
    return normalizeCategoryOrder(categories);
  }

  const normalizedCategories = normalizeCategoryOrder(categories);
  const sourceIndex = normalizedCategories.findIndex((category) => category.id === categoryId);

  if (sourceIndex === -1) {
    throw new Error("The selected category could not be found.");
  }

  const [movedCategory] = normalizedCategories.splice(sourceIndex, 1);

  if (!movedCategory) {
    throw new Error("The selected category could not be moved.");
  }

  const targetIndex = normalizedCategories.findIndex((category) => category.id === targetCategoryId);

  if (targetIndex === -1) {
    throw new Error("The drop target category could not be found.");
  }

  const insertionIndex = position === "after" ? targetIndex + 1 : targetIndex;
  normalizedCategories.splice(insertionIndex, 0, movedCategory);

  return normalizedCategories.map((category, index) => ({
    ...category,
    sortOrder: index,
  }));
}

export function buildCategoryOrderUpdates<T extends CategoryOrderItem>(
  previousCategories: readonly T[],
  nextCategories: readonly T[],
): Array<{ id: string; sortOrder: number }> {
  const previousById = new Map(previousCategories.map((category) => [category.id, category.sortOrder]));

  return nextCategories
    .filter((category) => previousById.get(category.id) !== category.sortOrder)
    .map((category) => ({
      id: category.id,
      sortOrder: category.sortOrder,
    }));
}

export function getCategoryOrderIndex(
  categories: readonly Pick<Category, "id" | "sortOrder" | "name" | "isActive">[],
  categoryId: string,
): number {
  return normalizeCategoryOrder(categories).findIndex((category) => category.id === categoryId);
}
