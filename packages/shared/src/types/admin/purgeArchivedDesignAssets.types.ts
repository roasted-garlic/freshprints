export const PURGE_ARCHIVED_DESIGN_ASSETS_CONFIRMATION_PHRASE = "DELETE IMAGES";

export const PURGE_ARCHIVED_DESIGN_ASSETS_MAX_IDS = 25;

export interface PurgeArchivedDesignAssetsRequest {
  designIds: string[];
  /** Required when any selected design is on an active show allocation. */
  confirmActiveQueue?: boolean;
  /**
   * Required when purging more than one design.
   * Must equal {@link PURGE_ARCHIVED_DESIGN_ASSETS_CONFIRMATION_PHRASE}.
   */
  confirmationPhrase?: string;
}

export type PurgeArchivedDesignAssetsResultStatus =
  | "purged"
  | "skipped_already_purged"
  | "failed";

export interface PurgeArchivedDesignAssetsItemResult {
  designId: string;
  status: PurgeArchivedDesignAssetsResultStatus;
  title?: string;
  error?: string;
  storageFilesDeleted?: number;
  hadActiveQueue?: boolean;
}

export interface PurgeArchivedDesignAssetsResponse {
  results: PurgeArchivedDesignAssetsItemResult[];
  purgedCount: number;
  skippedCount: number;
  failedCount: number;
}
