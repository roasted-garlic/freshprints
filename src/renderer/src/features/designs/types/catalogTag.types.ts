import type { CatalogTagStatus } from "../../../../../../shared/types/catalogTag.types";

export type {
  CatalogTag,
  CatalogTagInput,
  CatalogTagStatus,
  SuggestedNewTag,
} from "../../../../../../shared/types/catalogTag.types";

export interface CatalogTagListOptions {
  includeArchived?: boolean;
}

export interface CreateCatalogTagInput {
  name: string;
  aliases?: string[];
  preferredWhen: string;
}

export interface UpdateCatalogTagInput {
  name?: string;
  aliases?: string[];
  preferredWhen?: string;
  status?: CatalogTagStatus;
}
