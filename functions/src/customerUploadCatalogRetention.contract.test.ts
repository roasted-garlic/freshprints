import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

test("catalog retention uses one trusted episode timestamp across Denied and Excluded", () => {
  const confirmation = read("src/lib/customerUploadCatalogConfirmation.ts");
  const exclusion = read("src/excludeCustomerUploadFromCatalog.ts");
  const restore = read("src/restoreCustomerUploadCatalogEligibility.ts");
  const response = read("src/respondToCustomerUploadCatalogPermissionFollowUp.ts");

  assert.match(confirmation, /catalogRetentionStartedAt/);
  assert.match(exclusion, /catalogExclusionReason: "staff_review"/);
  assert.match(exclusion, /catalogRetentionStartedAt: FieldValue\.serverTimestamp\(\)/);
  assert.match(restore, /catalogRetentionStartedAt: FieldValue\.delete\(\)/);
  assert.match(response, /catalogRetentionStartedAt: approved/);
  assert.match(response, /catalogPendingQueuedAt: FieldValue\.serverTimestamp\(\)/);
  assert.match(response, /FieldValue\.serverTimestamp\(\)/);
  assert.match(restore, /catalogPendingQueuedAt: FieldValue\.serverTimestamp\(\)/);
});

test("retention scheduler is bounded, resumable, dry-runnable, and includes unpromoted donations", () => {
  const source = read("src/purgeExpiredCustomerUploadCatalogRetention.ts");
  assert.match(source, /onSchedule/);
  assert.match(source, /dryRun/);
  assert.match(source, /maxPerRun/);
  assert.match(source, /startAfter/);
  assert.match(source, /catalogRetentionStartedAt/);
  assert.match(source, /resolveCustomerUploadCatalogRetentionQueryCutoffDays/);
  assert.match(source, /isCustomerUploadCatalogRetentionEpisodeDue/);
  assert.match(source, /CUSTOMER_UPLOAD_UNPROMOTED_DONATION_RETENTION_REASON/);
  assert.match(source, /deferred-follow-up/);
  assert.match(source, /failed\/retryable/);
  assert.match(source, /buildPreview/);
  assert.match(source, /executeEligibleHardDelete/);
});

test("Studio customer-upload item and parent writes are atomic", () => {
  const source = read("../apps/studio/src/renderer/src/features/print-requests/services/printRequestService.ts");
  assert.match(source, /commitItemAndParentAtomically/);
  assert.match(source, /runTransaction\(db/);
  assert.match(source, /transaction\.set\(itemRef, payload\)/);
  assert.match(source, /transaction\.update\(requestRef/);
});

test("Portal request and item sync use bounded Firestore listeners", () => {
  const service = read("../apps/portal/features/print-requests/services/portalPrintRequestService.ts");
  const itemsHook = read("../apps/portal/features/print-requests/hooks/useWorkingCurrentRequestItems.ts");
  const requestsHook = read("../apps/portal/features/print-requests/hooks/useMyPrintRequests.ts");
  assert.match(service, /subscribeMyContinuablePrintRequests/);
  assert.match(service, /subscribePrintRequestItems/);
  assert.match(service, /onSnapshot/);
  assert.match(itemsHook, /subscribePrintRequestItems/);
  assert.match(requestsHook, /subscribeMyContinuablePrintRequests/);
  assert.doesNotMatch(itemsHook, /setInterval|setTimeout/);
});
