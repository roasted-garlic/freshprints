export type CatalogTagStatus = "approved" | "archived";

export interface CatalogTag {
  id: string;
  name: string;
  aliases: string[];
  preferredWhen: string;
  status: CatalogTagStatus;
  /**
   * When true, Portal may promote this tag as a featured pill in the tag filter modal.
   * Absent or false = normal tag. Multiple tags may be featured.
   */
  isFeatured?: boolean;
  createdBy: string;
  updatedBy: string;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface SuggestedNewTag {
  name: string;
  aliases: string[];
  preferredWhen: string;
  reason?: string;
  source?: "ai";
}

export interface CatalogTagInput {
  name: string;
  aliases?: string[];
  preferredWhen: string;
  isFeatured?: boolean;
}
