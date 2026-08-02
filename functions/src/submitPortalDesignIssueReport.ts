import { FieldValue } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";
import type { SubmitPortalDesignIssueReportResponse } from "../../packages/shared/src/designIssueReports/designIssueReport.types";
import { DESIGN_ISSUE_REPORT_DAILY_LIMIT } from "../../packages/shared/src/designIssueReports/designIssueReport.constants";
import { adminDb } from "./lib/admin";
import { alreadyExists, failedPrecondition, notFound, resourceExhausted, unauthenticated } from "./lib/errors";
import { requirePortalCustomer } from "./lib/portalCustomer";
import { chicagoDayKey, parseDesignIssueReportSubmission, safeDesignIssueHash } from "./lib/designIssueReportValidation";

export const submitPortalDesignIssueReport = onCall(async (request): Promise<SubmitPortalDesignIssueReportResponse> => {
  if (!request.auth?.uid) throw unauthenticated();
  const uid = request.auth.uid;
  const customer = await requirePortalCustomer(uid);
  const input = parseDesignIssueReportSubmission(request.data);
  const designRef = adminDb.collection("designs").doc(input.designId);
  const reportRef = adminDb.collection("designIssueReports").doc();
  const actorHash = safeDesignIssueHash(uid).slice(0, 32);
  const intentRef = adminDb.collection("designIssueReportIntents").doc(`${actorHash}_${safeDesignIssueHash(input.idempotencyKey)}`);
  const openGuardRef = adminDb.collection("designIssueReportOpenGuards").doc(`${actorHash}_${safeDesignIssueHash(input.designId)}`);
  const quotaRef = adminDb.collection("designIssueReportDailyQuotas").doc(`${actorHash}_${chicagoDayKey(new Date())}`);
  const descriptionFingerprint = safeDesignIssueHash(input.description);

  return adminDb.runTransaction(async (tx) => {
    const [intentSnap, designSnap, guardSnap, quotaSnap] = await Promise.all([
      tx.get(intentRef), tx.get(designRef), tx.get(openGuardRef), tx.get(quotaRef),
    ]);
    if (intentSnap.exists) {
      const prior = intentSnap.data();
      if (prior?.designId !== input.designId || prior?.descriptionFingerprint !== descriptionFingerprint) {
        throw failedPrecondition("This submission intent was already used for different report data.");
      }
      return { reportId: String(prior.reportId), status: "open", duplicate: true };
    }
    if (!designSnap.exists) throw notFound("Design not found.");
    const design = designSnap.data() ?? {};
    if (design.status !== "ready" || typeof design.title !== "string" || !design.title.trim()) {
      throw failedPrecondition("This design is not available in the Portal catalog.");
    }
    if (guardSnap.exists) throw alreadyExists("You already have an open report for this design.");
    const used = typeof quotaSnap.data()?.count === "number" ? quotaSnap.data()!.count : 0;
    if (used >= DESIGN_ISSUE_REPORT_DAILY_LIMIT) throw resourceExhausted("Daily design report limit reached.");
    const thumbnail = typeof design.previewPath === "string" && design.previewPath.startsWith("/previews/")
      ? design.previewPath
      : typeof design.thumbnailPath === "string" && design.thumbnailPath.startsWith("/thumbnails/") ? design.thumbnailPath : undefined;
    tx.create(reportRef, {
      designId: input.designId,
      customerUid: uid,
      customerId: customer.customerId,
      customerDisplayNameSnapshot: customer.displayName,
      customerUsernameSnapshot: customer.username,
      description: input.description,
      descriptionFingerprint,
      status: "open",
      designTitleSnapshot: design.title.trim(),
      ...(thumbnail ? { designThumbnailPathSnapshot: thumbnail } : {}),
      createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
    });
    tx.create(intentRef, { reportId: reportRef.id, designId: input.designId, descriptionFingerprint, createdAt: FieldValue.serverTimestamp() });
    tx.create(openGuardRef, { reportId: reportRef.id, customerUid: uid, designId: input.designId, createdAt: FieldValue.serverTimestamp() });
    tx.set(quotaRef, { count: used + 1, customerUid: uid, day: chicagoDayKey(new Date()), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return { reportId: reportRef.id, status: "open", duplicate: false };
  });
});
