export const DESIGN_ISSUE_REPORT_DESCRIPTION_MIN = 10;
export const DESIGN_ISSUE_REPORT_DESCRIPTION_MAX = 1_000;
export const DESIGN_ISSUE_REPORT_DAILY_LIMIT = 10;
export const DESIGN_ISSUE_REPORT_OPEN_LIMIT = 100;
export const DESIGN_ISSUE_REPORT_HISTORY_PAGE_SIZE = 50;

export function normalizeDesignIssueReportDescription(value: string): string {
  return value.replace(/\r\n?/g, "\n").trim();
}

export function isValidDesignIssueReportId(value: string): boolean {
  return /^[A-Za-z0-9_-]{1,128}$/.test(value);
}
