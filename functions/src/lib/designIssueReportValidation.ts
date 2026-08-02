import { createHash } from "node:crypto";
import {
  DESIGN_ISSUE_REPORT_DESCRIPTION_MAX,
  DESIGN_ISSUE_REPORT_DESCRIPTION_MIN,
  isValidDesignIssueReportId,
  normalizeDesignIssueReportDescription,
} from "../../../packages/shared/src/designIssueReports/designIssueReport.constants";
import { invalidArgument } from "./errors";

export function parseDesignIssueReportSubmission(data: unknown) {
  const input = data as Record<string, unknown> | null;
  const designId = typeof input?.designId === "string" ? input.designId.trim() : "";
  const idempotencyKey = typeof input?.idempotencyKey === "string" ? input.idempotencyKey.trim() : "";
  const description = normalizeDesignIssueReportDescription(
    typeof input?.description === "string" ? input.description : "",
  );
  if (!isValidDesignIssueReportId(designId)) throw invalidArgument("Design ID is invalid.");
  if (!/^[A-Za-z0-9_-]{16,128}$/.test(idempotencyKey)) throw invalidArgument("Submission intent is invalid.");
  if (description.length < DESIGN_ISSUE_REPORT_DESCRIPTION_MIN || description.length > DESIGN_ISSUE_REPORT_DESCRIPTION_MAX) {
    throw invalidArgument(`Description must be ${DESIGN_ISSUE_REPORT_DESCRIPTION_MIN}–${DESIGN_ISSUE_REPORT_DESCRIPTION_MAX} characters.`);
  }
  return { designId, idempotencyKey, description };
}

export function safeDesignIssueHash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function chicagoDayKey(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}
