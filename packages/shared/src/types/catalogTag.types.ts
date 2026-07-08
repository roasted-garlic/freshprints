export type CatalogTagStatus = "approved" | "archived";

export interface CatalogTag {
  id: string;
  name: string;
  aliases: string[];
  preferredWhen: string;
  status: CatalogTagStatus;
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
}
