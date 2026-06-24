import type { DesignStatus } from "./designStatus.types";

export interface DesignFormValues {
  title: string;
  description: string;
  categoryId: string;
  tagsInput: string;
  status: DesignStatus;
  originalPath: string;
  thumbnailPath: string;
  previewPath: string;
  pixelWidth: string;
  pixelHeight: string;
  printWidthInches: string;
  printHeightInches: string;
  printAspectRatioLocked: boolean;
}

export const emptyDesignFormValues: DesignFormValues = {
  title: "",
  description: "",
  categoryId: "",
  tagsInput: "",
  status: "ready",
  originalPath: "",
  thumbnailPath: "",
  previewPath: "",
  pixelWidth: "",
  pixelHeight: "",
  printWidthInches: "",
  printHeightInches: "",
  printAspectRatioLocked: true,
};

export interface CategoryFormValues {
  name: string;
  description: string;
  sortOrder: string;
}

export const emptyCategoryFormValues: CategoryFormValues = {
  name: "",
  description: "",
  sortOrder: "0",
};
