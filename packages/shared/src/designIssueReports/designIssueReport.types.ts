export type DesignIssueReportStatus = "open" | "resolved";

export interface DesignIssueReport {
  id: string;
  designId: string;
  customerUid: string;
  customerId: string;
  customerDisplayNameSnapshot: string;
  customerUsernameSnapshot: string;
  description: string;
  status: DesignIssueReportStatus;
  designTitleSnapshot: string;
  designThumbnailPathSnapshot?: string;
  createdAtMillis: number;
  updatedAtMillis: number;
  resolvedAtMillis?: number;
  resolvedByUid?: string;
}

export interface SubmitPortalDesignIssueReportRequest {
  designId: string;
  description: string;
  idempotencyKey: string;
}

export interface SubmitPortalDesignIssueReportResponse {
  reportId: string;
  status: "open";
  duplicate: boolean;
}

export interface ResolveDesignIssueReportRequest { reportId: string }
export interface ResolveDesignIssueReportResponse {
  reportId: string;
  status: "resolved";
  alreadyResolved: boolean;
}
