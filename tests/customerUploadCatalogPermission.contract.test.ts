import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const ROOT = join(import.meta.dirname, "..");
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");

test("customer upload permission follow-up exports the three narrow callable boundaries", () => {
  const index = read("functions/src/index.ts");
  assert.match(index, /export \{ requestCustomerUploadCatalogPermissionFollowUp \}/);
  assert.match(index, /export \{ getCustomerUploadCatalogPermissionFollowUp \}/);
  assert.match(index, /export \{ respondToCustomerUploadCatalogPermissionFollowUp \}/);
});

test("follow-up response is maintenance guarded and transactionally state-scoped", () => {
  const request = read("functions/src/requestCustomerUploadCatalogPermissionFollowUp.ts");
  const context = read("functions/src/getCustomerUploadCatalogPermissionFollowUp.ts");
  const response = read("functions/src/respondToCustomerUploadCatalogPermissionFollowUp.ts");

  assert.match(request, /assertCanManageCustomerUploadIntake/);
  assert.match(request, /canRequestCustomerUploadPermissionFollowUp/);
  assert.match(request, /catalogPermissionAskCount/);
  assert.match(request, /catalogPermissionActivity/);
  assert.match(request, /createCustomerNotification/);
  assert.match(request, /base64url/);
  assert.match(request, /alreadyRequested/);
  assert.match(request, /Both permission follow-up requests have already been used/);
  assert.doesNotMatch(request, /one follow-up decision/);
  assert.match(response, /customer_allow|customer_decline/);
  assert.match(response, /catalogPermissionActivity/);
  assert.match(request, /const activityNow = Timestamp\.now\(\)/);
  assert.match(request, /at: activityNow/);
  assert.match(response, /at: Timestamp\.now\(\)/);
  assert.match(context, /requirePortalCustomer/);
  assert.match(context, /catalogPermissionFollowUpRequestToken/);
  assert.match(context, /previewStoragePath/);
  assert.doesNotMatch(context, /getSignedUrl/);
  const dto = read(
    "packages/shared/src/types/customerUpload/customerUploadCatalogPermission.types.ts",
  );
  const publicDto = dto.match(
    /export interface GetCustomerUploadCatalogPermissionFollowUpRequest[\s\S]*$/,
  )?.[0] ?? "";
  assert.doesNotMatch(publicDto, /uploadId/);
  assert.match(response, /assertPortalMaintenanceAllowsCustomerMutation/);
  assert.match(response, /adminDb\.runTransaction/);
  assert.match(response, /catalogPermissionFollowUpStatus/);
  assert.match(response, /catalogReviewStatus: approved \? "pending_staff_review"/);
  assert.match(response, /decision === "allow"/);
  assert.match(response, /customerUid !== request\.auth/);
  assert.match(response, /alreadyDecision/);
  assert.match(response, /promotedDesignId/);
  assert.match(response, /markPermissionFollowUpNotificationRead/);
  assert.match(response, /buildCustomerUploadCatalogPermissionFollowUpNotificationId/);
});

test("Studio exposes follow-up only for permission-denied exclusions and preserves generic Restore", () => {
  const section = read(
    "apps/studio/src/renderer/src/features/customer-uploads/components/CustomerUploadIntakeSection.tsx",
  );
  const hook = read(
    "apps/studio/src/renderer/src/features/customer-uploads/hooks/useCustomerUploadIntake.ts",
  );
  const service = read(
    "apps/studio/src/renderer/src/features/customer-uploads/services/customerUploadIntakeService.ts",
  );

  assert.match(section, /customer_permission_denied/);
  assert.match(section, /Ask for permission again|Ask again \(2 of 2\)/);
  assert.match(section, /CustomerUploadPermissionActivityModal|Activity/);
  assert.match(section, /pendingAction === "request_permission"/);
  assert.match(section, /!permissionDenied/);
  assert.match(hook, /requestPermissionFollowUp/);
  assert.match(service, /requestCustomerUploadCatalogPermissionFollowUp/);
});

test("Portal deep-link host uses an opaque permissionRequest token", () => {
  const page = read("apps/portal/app/(app)/requests/artwork/page.tsx");
  const modal = read(
    "apps/portal/features/customer-uploads/components/CustomerUploadCatalogPermissionFollowUpModal.tsx",
  );
  assert.match(page, /searchParams\.get\('permissionRequest'\)/);
  assert.match(page, /CustomerUploadCatalogPermissionFollowUpModal/);
  assert.match(modal, /getCatalogPermissionFollowUp/);
  assert.match(modal, /respondToCatalogPermissionFollowUp/);
  assert.doesNotMatch(modal, /uploadId/);
  // Preview uses opaque Storage path + client getDownloadURL (no Admin signed URL).
  assert.match(modal, /previewStoragePath/);
  assert.match(modal, /getDownloadUrl/);
});
