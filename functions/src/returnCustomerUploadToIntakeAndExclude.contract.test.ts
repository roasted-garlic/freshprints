import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function read(path: string): string {
  return readFileSync(path, "utf8");
}

describe("Customer Upload promotion reversal contract", () => {
  const source = read("functions/src/returnCustomerUploadToIntakeAndExclude.ts");

  it("is a staff-authorized callable with the reviewed upload eligibility", () => {
    assert.match(source, /request\.auth\?\.uid/);
    assert.match(source, /assertStaffCaller/);
    assert.match(source, /assertCanManageCustomerUploadIntake/);
    assert.match(source, /sent_to_ai_review/);
    assert.match(source, /technicalStatus !== "ready"/);
    assert.match(source, /ownershipConfirmed !== true/);
  });

  it("requires strict provenance and only allows pre-ready, unapproved designs", () => {
    assert.match(source, /design\.sourceCustomerUploadId !== uploadId/);
    assert.match(source, /new Set\(\["imported", "processing", "rejected"\]\)/);
    assert.match(source, /aiReviewStatus === APPROVED_AI_REVIEW_STATUS/);
    assert.match(source, /companionDesignIds/);
    assert.match(source, /companionSetId/);
  });

  it("rechecks downstream references before invalidation and before deletion", () => {
    assert.match(source, /collectDesignReferenceBlockersInTransaction/);
    assert.equal(
      (source.match(/await collectDesignReferenceBlockersInTransaction/g) ?? []).length,
      2,
    );
  });

  it("implements invalidation, canonical derived cleanup, final recheck, and backlink removal", () => {
    const invalidation = source.indexOf("aiProcessingAttemptId: FieldValue.delete()");
    const cleanup = source.indexOf("deleteDesignStorageAssets(designId)");
    const finalTransaction = source.indexOf("// Final transaction rechecks");
    const backlinkRemoval = source.indexOf("promotedDesignId: FieldValue.delete()", finalTransaction);

    assert.ok(invalidation >= 0);
    assert.ok(cleanup > invalidation);
    assert.ok(finalTransaction > cleanup);
    assert.ok(backlinkRemoval > finalTransaction);
    assert.match(source, /catalogRetentionStartedAt: FieldValue\.serverTimestamp\(\)/);
    assert.doesNotMatch(source, /deleteEligibleCustomerUpload/);
    assert.doesNotMatch(source, /sourceStoragePath: FieldValue\.delete/);
    assert.doesNotMatch(source, /productionStoragePath: FieldValue\.delete/);
    assert.doesNotMatch(source, /promotedAt: FieldValue\.delete/);
  });

  it("is exported and blocks stale enqueue work after the upload leaves AI Review", () => {
    const index = read("functions/src/index.ts");
    const enqueue = read("functions/src/enqueueAiEnrichment.ts");
    assert.match(index, /returnCustomerUploadToIntakeAndExclude/);
    assert.match(enqueue, /sourceUpload\.catalogReviewStatus !== "sent_to_ai_review"/);
    assert.match(enqueue, /This Customer Upload is no longer in AI Review/);
  });
});
