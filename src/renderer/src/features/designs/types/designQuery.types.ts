import type { DesignStatus } from "./designStatus.types";

export interface DesignListQuery {
  status?: DesignStatus;
  categoryId?: string;
  tag?: string;
  limitCount?: number;
}
