export type ArtworkBackgroundPreset = "grey" | "lightBlack" | "white" | "custom";

export interface DesignFormValues {
  title: string;
  description: string;
  categoryId: string;
  tagsInput: string;
  artworkBackgroundPreset: ArtworkBackgroundPreset;
  /** Raw custom hex input when preset is `custom` (with or without `#`). */
  artworkBackgroundCustomHex: string;
}

export const emptyDesignFormValues: DesignFormValues = {
  title: "",
  description: "",
  categoryId: "",
  tagsInput: "",
  artworkBackgroundPreset: "grey",
  artworkBackgroundCustomHex: "",
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
