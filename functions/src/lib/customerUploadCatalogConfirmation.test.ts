import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildCatalogIntakeConfirmationPatch,
  buildCustomerUploadStaffReviewTransitionPatch,
  shouldAdvanceCustomerUploadToStaffReview,
} from "./customerUploadCatalogConfirmation";

const here = dirname(fileURLToPath(import.meta.url));

describe("buildCatalogIntakeConfirmationPatch — Workstream E intake timing", () => {
  it("print-request attach / assisted reaffirm not_eligible (do not submit for staff review)", () => {
    const patch = buildCatalogIntakeConfirmationPatch({
      catalogUseAcknowledged: true,
      termsVersion: "v1",
      printRequestId: "pr1",
      submitForStaffReview: false,
      now: "NOW" as never,
    });
    assert.equal(patch.catalogReviewStatus, "not_eligible");
    assert.equal(patch.ownershipConfirmed, true);
    assert.equal(patch.catalogUseAcknowledged, true);
    assert.equal(patch.printRequestId, "pr1");
    assert.equal(patch.termsVersion, "v1");
    assert.equal(patch.confirmedAt, "NOW");
    assert.equal(patch.updatedAt, "NOW");
  });

  it("donate confirm still sets pending_staff_review", () => {
    const patch = buildCatalogIntakeConfirmationPatch({
      catalogUseAcknowledged: true,
      termsVersion: "donate-v1",
      printRequestId: null,
      submitForStaffReview: true,
      now: "NOW" as never,
    });
    assert.equal(patch.catalogReviewStatus, "pending_staff_review");
    assert.equal(patch.printRequestId, null);
  });

  it("declined library permission still uses the same review status branch", () => {
    const attach = buildCatalogIntakeConfirmationPatch({
      catalogUseAcknowledged: false,
      termsVersion: "v1",
      printRequestId: "pr1",
      submitForStaffReview: false,
      now: "NOW" as never,
    });
    assert.equal(attach.catalogUseAcknowledged, false);
    assert.equal(attach.catalogReviewStatus, "not_eligible");
  });
});

describe("shouldAdvanceCustomerUploadToStaffReview — idempotent show-allocation advance", () => {
  it("only advances from not_eligible", () => {
    assert.equal(shouldAdvanceCustomerUploadToStaffReview("not_eligible"), true);
  });

  it("no-ops when already pending, excluded, or sent_to_ai_review", () => {
    assert.equal(shouldAdvanceCustomerUploadToStaffReview("pending_staff_review"), false);
    assert.equal(shouldAdvanceCustomerUploadToStaffReview("excluded_from_catalog"), false);
    assert.equal(shouldAdvanceCustomerUploadToStaffReview("sent_to_ai_review"), false);
    assert.equal(shouldAdvanceCustomerUploadToStaffReview(undefined), false);
    assert.equal(shouldAdvanceCustomerUploadToStaffReview(null), false);
  });

  it("transition patch sets pending_staff_review without creating designs", () => {
    const patch = buildCustomerUploadStaffReviewTransitionPatch("NOW" as never);
    assert.deepEqual(patch, {
      catalogReviewStatus: "pending_staff_review",
      updatedAt: "NOW",
    });
    assert.equal("promotedDesignId" in patch, false);
  });
});

describe("caller wiring — attach ≠ pending, donate = pending, queue + allocation flip", () => {
  const attachSource = readFileSync(
    join(here, "..", "confirmCustomerUploadsAndAttachToRequest.ts"),
    "utf8",
  );
  const donateSource = readFileSync(
    join(here, "..", "confirmCustomerUploadsForDonation.ts"),
    "utf8",
  );
  const assistedSource = readFileSync(
    join(here, "..", "customerAddAssistedApprovedProofToPrintRequest.ts"),
    "utf8",
  );
  const queueSource = readFileSync(
    join(here, "..", "queuePortalPrintRequestToShow.ts"),
    "utf8",
  );
  const allocationTriggerSource = readFileSync(
    join(here, "..", "onShowAllocationCreated.ts"),
    "utf8",
  );

  it("attach callable passes submitForStaffReview: false", () => {
    assert.match(attachSource, /submitForStaffReview:\s*false/);
    assert.doesNotMatch(attachSource, /submitForStaffReview:\s*true/);
  });

  it("assisted Add to Request passes submitForStaffReview: false on both confirmation sites", () => {
    const matches = assistedSource.match(/submitForStaffReview:\s*false/g) ?? [];
    assert.equal(matches.length, 2);
    assert.doesNotMatch(assistedSource, /submitForStaffReview:\s*true/);
  });

  it("donate callable passes submitForStaffReview: true", () => {
    assert.match(donateSource, /submitForStaffReview:\s*true/);
    assert.doesNotMatch(donateSource, /submitForStaffReview:\s*false/);
  });

  it("successful queue TX advances eligible uploads inside the same transaction", () => {
    assert.match(queueSource, /freshUploadSnaps/);
    // Call site (not the import): helper invoked with the TX handle inside runTransaction.
    assert.match(
      queueSource,
      /applyCustomerUploadStaffReviewTransitionInTransaction\(\s*transaction,/,
    );
    const txBlock = queueSource.match(
      /await adminDb\.runTransaction\(async \(transaction\) => \{[\s\S]*?\n {4}\}\);/,
    )?.[0];
    assert.ok(txBlock, "queue transaction block must exist");
    assert.match(
      txBlock,
      /applyCustomerUploadStaffReviewTransitionInTransaction\(\s*transaction,/,
    );
  });

  it("allocation onCreate advances customer_upload sources via shared helper", () => {
    assert.match(
      allocationTriggerSource,
      /sourceType === "customer_upload"/,
    );
    assert.match(
      allocationTriggerSource,
      /transitionCustomerUploadToStaffReviewIfEligible/,
    );
  });

  it("allocation onCreate does not create Designs or auto Send to AI for uploads", () => {
    const customerUploadBranch =
      allocationTriggerSource.match(
        /if \(data\.sourceType === "customer_upload"\) \{([\s\S]*?)return;\s*\}/,
      )?.[1] ?? "";
    assert.ok(customerUploadBranch.length > 0, "customer_upload branch must exist");
    assert.doesNotMatch(customerUploadBranch, /designs|promoteCustomerUpload|sent_to_ai_review/);
  });

  it("failed Add to Show cannot flip review — transition is only inside successful TX writes", () => {
    // Pre-TX validation throws leave runTransaction unentered; no customerUploads update outside TX.
    assert.doesNotMatch(
      queueSource,
      /catalogReviewStatus:\s*"pending_staff_review"/,
    );
    assert.match(queueSource, /applyCustomerUploadStaffReviewTransitionInTransaction/);
  });
});
