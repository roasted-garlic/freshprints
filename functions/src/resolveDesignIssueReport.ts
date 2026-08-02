import { FieldValue } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";
import type { ResolveDesignIssueReportResponse } from "../../packages/shared/src/designIssueReports/designIssueReport.types";
import { isValidDesignIssueReportId } from "../../packages/shared/src/designIssueReports/designIssueReport.constants";
import { adminDb } from "./lib/admin";
import { invalidArgument, notFound, permissionDenied, unauthenticated } from "./lib/errors";
import { loadCallerProfile } from "./lib/caller";
import { safeDesignIssueHash } from "./lib/designIssueReportValidation";

export const resolveDesignIssueReport = onCall(async (request): Promise<ResolveDesignIssueReportResponse> => {
  if (!request.auth?.uid) throw unauthenticated();
  const uid = request.auth.uid;
  const caller = await loadCallerProfile(uid);
  if (!caller.isActive || !["owner", "admin", "helper"].includes(caller.role)) throw permissionDenied();
  const reportId = typeof request.data?.reportId === "string" ? request.data.reportId.trim() : "";
  if (!isValidDesignIssueReportId(reportId)) throw invalidArgument("Report ID is invalid.");
  const reportRef = adminDb.collection("designIssueReports").doc(reportId);
  return adminDb.runTransaction(async (tx) => {
    const reportSnap = await tx.get(reportRef);
    if (!reportSnap.exists) throw notFound("Report not found.");
    const report = reportSnap.data()!;
    if (report.status === "resolved") return { reportId, status: "resolved", alreadyResolved: true };
    if (report.status !== "open") throw invalidArgument("Report status is invalid.");
    const actorHash = safeDesignIssueHash(String(report.customerUid)).slice(0, 32);
    const guardRef = adminDb.collection("designIssueReportOpenGuards").doc(`${actorHash}_${safeDesignIssueHash(String(report.designId))}`);
    tx.update(reportRef, { status: "resolved", resolvedAt: FieldValue.serverTimestamp(), resolvedByUid: uid, updatedAt: FieldValue.serverTimestamp() });
    tx.delete(guardRef);
    return { reportId, status: "resolved", alreadyResolved: false };
  });
});
