export interface DesignFormValues {
  title: string;
  description: string;
  categoryId: string;
  tagsInput: string;
}

export const emptyDesignFormValues: DesignFormValues = {
  title: "",
  description: "",
  categoryId: "",
  tagsInput: "",
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
