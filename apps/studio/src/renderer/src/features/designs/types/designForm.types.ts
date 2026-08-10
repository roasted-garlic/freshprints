export type ArtworkBackgroundPreset = "grey" | "lightBlack" | "white" | "custom";

export interface DesignFormValues {
  title: string;
  description: string;
  categoryId: string;
  tagsInput: string;
  artworkBackgroundPreset: ArtworkBackgroundPreset;
  /** Raw custom hex input when preset is `custom` (with or without `#`). */
  artworkBackgroundCustomHex: string;
  /**
   * Optional "Placement" select value — an `ArtworkPlacement` string, or `""`/missing for
   * Unspecified (clears the field on save). Optional so existing partial `DesignFormValues`
   * literals used only for artwork-background hex preview do not need to supply it — always
   * read with `?? ""`.
   */
  artworkPlacement?: string;
  /**
   * Staff-only "Explicit Content" classification (mirrors `Design.isExplicitContent`). Optional
   * so existing partial `DesignFormValues`-shaped literals used only for artwork-background hex
   * preview (e.g. `ArtworkBackgroundPreviewControl`, AI Review workspace preview) do not need to
   * supply it — always read with `?? false`.
   */
  isExplicitContent?: boolean;
  /**
   * Chip-input string for staff censored terms (comma-separated), mapped to `Design.censoredTerms`
   * on save. Optional so partial form literals need not supply it — read with `?? ""`.
   */
  censoredTermsInput?: string;
}

export const emptyDesignFormValues: DesignFormValues = {
  title: "",
  description: "",
  categoryId: "",
  tagsInput: "",
  artworkBackgroundPreset: "grey",
  artworkBackgroundCustomHex: "",
  artworkPlacement: "",
  isExplicitContent: false,
  censoredTermsInput: "",
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
