export const DELETE_ELIGIBLE_UNAPPROVED_DESIGN_CONFIRMATION_PHRASE =
  "DELETE UNAPPROVED DESIGNS" as const;

export const DELETE_ELIGIBLE_UNAPPROVED_DESIGN_MAX_IDS = 25;

export interface DeleteEligibleUnapprovedDesignRequest {
  designIds: string[];
  confirmationPhrase?: string;
}

export type DeleteEligibleUnapprovedDesignItemStatus =
  | "deleted"
  | "skipped_already_deleted"
  | "failed";

export interface DeleteEligibleUnapprovedDesignItemResult {
  designId: string;
  status: DeleteEligibleUnapprovedDesignItemStatus;
  title?: string;
  error?: string;
  storageFilesDeleted?: number;
  blockers?: string[];
}

export interface DeleteEligibleUnapprovedDesignResponse {
  results: DeleteEligibleUnapprovedDesignItemResult[];
  deletedCount: number;
  skippedCount: number;
  failedCount: number;
}
