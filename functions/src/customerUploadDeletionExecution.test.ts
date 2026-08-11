import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./deleteEligibleCustomerUpload.ts", import.meta.url), "utf8");

test("execution rechecks eligibility and validates the asset manifest before cleanup", () => {
  assert.match(source, /const recheck = await buildPreview/);
  assert.match(source, /sourceCustomerUploadId/);
  assert.match(source, /resolveCustomerUploadAssetManifest\(data, customerUploadId\)/);
});

test("partial Storage failure retains the upload document and reports failed", () => {
  const failure = source.indexOf("if (storageCleanupFailed)");
  const documentDelete = source.indexOf("transaction.delete(uploadRef)");
  assert.ok(failure >= 0 && documentDelete > failure);
  assert.match(source.slice(failure, documentDelete), /outcome:\s*"failed"/);
  assert.match(source.slice(failure, documentDelete), /record was retained/);
});

test("complete cleanup deletes only the upload document and upload-specific batch metadata", () => {
  assert.match(source, /buildCustomerUploadBatchDeletionPatch/);
  assert.match(source, /transaction\.delete\(uploadRef\)/);
  assert.doesNotMatch(source, /transaction\.delete\(batchRef\)/);
  assert.doesNotMatch(source, /archive\.zip.*delete/);
});

test("donation day refund runs once in the same transaction as Firestore doc delete", () => {
  assert.match(source, /resolveDonationFinalizeQuotaRefundTarget/);
  assert.match(source, /applyDonationFinalizeQuotaRefundInTransaction\(/);
  const executeStart = source.indexOf("async function executeEligibleHardDelete");
  const executeBody = source.slice(executeStart);
  const refundApply = executeBody.indexOf("applyDonationFinalizeQuotaRefundInTransaction(");
  const documentDelete = executeBody.indexOf("transaction.delete(uploadRef)");
  assert.ok(refundApply >= 0 && documentDelete > refundApply);
  // Blocked / Storage-failed paths return before the transaction — no refund.
  const storageFailReturn = executeBody.indexOf("storageCleanupFailed: true");
  assert.ok(storageFailReturn >= 0 && storageFailReturn < refundApply);
});
test("portal customer path requires ownership and does not use staff delete auth", () => {
  assert.match(source, /export const previewPortalCustomerUploadDeletion/);
  assert.match(source, /export const deletePortalCustomerUpload/);
  assert.match(source, /requireOwnerUid:\s*request\.auth\.uid/);
  assert.match(source, /You can only delete your own uploads/);

  const portalPreview = source.slice(source.indexOf("previewPortalCustomerUploadDeletion"));
  const portalDelete = source.slice(source.indexOf("deletePortalCustomerUpload"));
  assert.doesNotMatch(portalPreview, /assertCanDeleteCustomerUpload/);
  assert.doesNotMatch(portalDelete, /assertCanDeleteCustomerUpload/);

  const staffPreview = source.slice(
    source.indexOf("export const previewCustomerUploadDeletion"),
    source.indexOf("export const deleteEligibleCustomerUpload"),
  );
  assert.match(staffPreview, /assertCanDeleteCustomerUpload/);
});

test("blocked preview outcomes skip Storage cleanup and refund", () => {
  const executeStart = source.indexOf("async function executeEligibleHardDelete");
  const executeBody = source.slice(executeStart, source.indexOf("export const previewCustomerUploadDeletion"));
  assert.match(executeBody, /preview\.outcome !== "allowed_hard_delete"/);
  const blockedReturn = executeBody.indexOf('message: preview.blockers[0]');
  const storageLoop = executeBody.indexOf("for (const path of assetManifest.paths)");
  const refundCall = executeBody.indexOf("applyDonationFinalizeQuotaRefundInTransaction");
  assert.ok(blockedReturn >= 0 && storageLoop > blockedReturn);
  assert.ok(refundCall > storageLoop);
});
