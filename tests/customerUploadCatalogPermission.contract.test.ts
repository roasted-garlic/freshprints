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
  assert.match(request, /catalogExclusionReason.*customer_permission_denied/);
  assert.match(request, /catalogPermissionFollowUpStatus.*requested/);
  assert.match(request, /createCustomerNotification/);
  assert.match(request, /base64url/);
  assert.match(request, /alreadyRequested/);
  assert.match(request, /approved.*declined/);
  assert.match(context, /requirePortalCustomer/);
  assert.match(context, /catalogPermissionFollowUpRequestToken/);
  assert.match(context, /getSignedUrl/);
  const dto = read(
    "packages/shared/src/types/customerUpload/customerUploadCatalogPermission.types.ts",
  );
  const publicDto = dto.match(
    /export interface GetCustomerUploadCatalogPermissionFollowUpRequest[\s\S]*$/,
  )?.[0] ?? "";
  assert.doesNotMatch(publicDto, /uploadId/);
  assert.doesNotMatch(publicDto, /StoragePath/i);
  assert.match(response, /assertPortalMaintenanceAllowsCustomerMutation/);
  assert.match(response, /adminDb\.runTransaction/);
  assert.match(response, /catalogPermissionFollowUpStatus/);
  assert.match(response, /catalogReviewStatus: approved \? "pending_staff_review"/);
  assert.match(response, /decision === "allow"/);
  assert.match(response, /customerUid !== request\.auth/);
  assert.match(response, /alreadyDecision/);
  assert.match(response, /promotedDesignId/);
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
  assert.match(section, /Ask for permission again/);
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
  assert.doesNotMatch(modal, /StoragePath/);
});
