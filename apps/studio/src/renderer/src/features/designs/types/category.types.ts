import type { Timestamp } from "firebase/firestore";

export interface Category {
  id: string;
  name: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
  createdBy: string;
  updatedBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CreateCategoryInput {
  id?: string;
  name: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export type UpdateCategoryInput = Partial<
  Pick<Category, "name" | "description" | "sortOrder" | "isActive">
>;

export interface CategoryListOptions {
  includeInactive?: boolean;
}
