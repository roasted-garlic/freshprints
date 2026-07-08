import type { AiReviewStatus } from "./aiReview.types";
import type { Design } from "./design.types";
import type { DesignStatus } from "./designStatus.types";

export type DesignListSortField = "createdAt" | "updatedAt";
export type DesignListSortDirection = "asc" | "desc";

export interface DesignListCursor {
  designId: string;
  /** Milliseconds for the active sort field at cursor position */
  sortMillis: number;
}

export interface DesignListQuery {
  aiReviewStatus?: AiReviewStatus;
  categoryId?: string;
  cursor?: DesignListCursor;
  limitCount?: number;
  /** Single status equality — used by AI Review and legacy callers */
  status?: DesignStatus;
  /** Catalog browse: `ready` (approved) or `archived` (archived catalog toggle) */
  statusIn?: DesignStatus[];
  tag?: string;
  sortField?: DesignListSortField;
  sortDirection?: DesignListSortDirection;
}

export interface DesignListPage {
  designs: Design[];
  hasMore: boolean;
  nextCursor?: DesignListCursor;
}
