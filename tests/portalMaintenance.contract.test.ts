import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const ROOT = join(import.meta.dirname, "..");

const customerMutationSources = [
  "addPortalCatalogDesignToPrintRequest.ts",
  "assistedCreationRequests.ts",
  "clearPortalWorkingPrintRequest.ts",
  "completeEtsyRecommendationRequest.ts",
  "confirmCustomerUploadsAndAttachToRequest.ts",
  "confirmCustomerUploadsForDonation.ts",
  "createCustomerUploadBatch.ts",
  "createPortalPrintRequest.ts",
  "customerAddAssistedApprovedProofToPrintRequest.ts",
  "deleteEligibleCustomerUpload.ts",
  "duplicatePortalPrintRequestItem.ts",
  "etsySuggestionRequests.ts",
  "finalizeCustomerUpload.ts",
  "finalizeCustomerUploadZip.ts",
  "queuePortalPrintRequestToShow.ts",
  "recordCustomerUploadHalftoneResponse.ts",
  "respondToCustomerUploadCatalogPermissionFollowUp.ts",
  "clearCustomerNotificationHistory.ts",
  "registerCustomer.ts",
  "registerWebPushSubscription.ts",
  "removePortalPrintRequestItem.ts",
  "requestPortalAccountDeletion.ts",
  "searchEtsyRecommendations.ts",
  "setPrintRequestItemArtworkEnhanceMode.ts",
  "submitEtsyRecommendationRequest.ts",
  "submitPortalDesignIssueReport.ts",
  "syncPortalAccountEmail.ts",
  "unqueuePortalPrintRequestFromShow.ts",
  "updatePortalCustomerProfile.ts",
  "updatePortalPrintRequestItemQuantity.ts",
];

function read(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

test("maintenance callables are exported and keep customer mutations guarded", () => {
  const index = read("functions/src/index.ts");
  assert.match(index, /export \{ updatePortalMaintenanceState \}/);
  assert.match(index, /export \{ getPortalMaintenanceState \}/);
  assert.match(index, /export \{ listPortalMaintenanceTestCustomers \}/);

  for (const source of customerMutationSources) {
    const contents = read(join("functions/src", source));
    assert.match(
      contents,
      /assertPortalMaintenanceAllowsCustomerMutation\(/,
      `${source} is missing the reviewed customer-mutation guard`,
    );
  }
});

test("Rules and callable response contract remain fail-closed and private", () => {
  const firestoreRules = read("firestore.rules");
  const storageRules = read("storage.rules");
  const trustedReader = read("functions/src/lib/portalMaintenance.ts");
  const publicCallable = read("functions/src/getPortalMaintenanceState.ts");
  const candidateCallable = read("functions/src/listPortalMaintenanceTestCustomers.ts");

  assert.match(firestoreRules, /function portalMaintenanceAllowsCustomerMutation\(\)/);
  assert.match(storageRules, /function portalMaintenanceAllowsCustomerMutation\(\)/);
  assert.match(firestoreRules, /match \/settings\/portalMaintenance/);
  assert.match(firestoreRules, /allow write: if false;/);
  assert.match(trustedReader, /missing.*OFF|missing document.*OFF/i);
  assert.match(trustedReader, /PORTAL_MAINTENANCE_STATE_ERROR_CODE/);
  assert.match(publicCallable, /loadPortalMaintenancePublicState/);
  assert.match(publicCallable, /invoker:\s*["']public["']/);
  assert.doesNotMatch(publicCallable, /settings\/portalMaintenance/);
  assert.match(publicCallable, /no-store|not cached|cache/i);
  assert.match(trustedReader, /maintenanceTestCustomerUid/);
  assert.match(publicCallable, /request\.auth\?\.uid/);
  assert.match(candidateCallable, /loadCallerProfile/);
  assert.match(candidateCallable, /owner|admin/);
  assert.match(candidateCallable, /listActiveLinkedMaintenanceTestCustomers/);
  assert.match(candidateCallable, /unauthenticated/);
  assert.match(candidateCallable, /permissionDenied/);
  assert.match(candidateCallable, /caller\.isActive/);
});

test("owner control, audit, bounded refresh, and isolated recovery paths stay in scope", () => {
  const updateCallable = read("functions/src/updatePortalMaintenanceState.ts");
  const trustedReader = read("functions/src/lib/portalMaintenance.ts");
  const provider = read("apps/portal/features/maintenance/context/PortalMaintenanceContext.tsx");
  const experience = read("apps/portal/features/maintenance/components/PortalMaintenanceExperience.tsx");
  const shell = read("apps/portal/features/navigation/components/PortalAppShell.tsx");
  const studioControl = read(
    "apps/studio/src/renderer/src/features/settings/components/PortalMaintenanceSettingsSection.tsx",
  );
  const storageRules = read("storage.rules");

  assert.match(updateCallable, /loadCallerProfile/);
  assert.match(updateCallable, /owner|admin/);
  assert.match(updateCallable, /savePortalMaintenanceState/);
  assert.match(trustedReader, /serverTimestamp\(\)/);
  assert.match(trustedReader, /updatedBy/);
  assert.match(provider, /visibilitychange/);
  assert.doesNotMatch(provider, /setInterval/);
  assert.match(provider, /setStatus\('error'\)/);
  assert.match(provider, /firebaseUser\?\.uid/);
  assert.match(shell, /isMaintenanceBlocked/);
  assert.match(
    shell,
    /maintenanceStatus === 'ready' && maintenanceEnabled && !maintenanceTestAccessGranted/,
  );
  assert.match(shell, /PortalMaintenanceTestBanner/);
  assert.match(provider, /maintenanceTestAccessGranted/);
  assert.match(provider, /heading/);
  assert.match(experience, /const \{ enabled, heading,[\s\S]*message/);
  assert.match(experience, /enabled[\s\S]*\? heading/);
  assert.match(experience, /enabled[\s\S]*\? message/);
  assert.match(studioControl, /Maintenance test customer/);
  assert.match(studioControl, /Maintenance heading/);
  assert.match(studioControl, /Maintenance message/);
  assert.match(studioControl, /settings-text-input/);
  assert.match(studioControl, /settings-textarea-input/);
  assert.match(studioControl, /listTestCustomers/);
  assert.match(studioControl, /canManageSettings/);
  assert.match(studioControl, /disabled=\{isLoading \|\| isSaving\}/);
  assert.match(storageRules, /allow delete: if isStaff\(\);/);

  const authProvider = read("apps/portal/features/auth/context/AuthProvider.tsx");
  assert.match(authProvider, /router\.replace\('\/login'\)/);
  const loginPage = read("apps/portal/app/login/page.tsx");
  assert.match(loginPage, /PortalLoginMaintenanceBanner/);
  assert.match(loginPage, /PortalLoginBrowseDesignsAction/);
  const loginNotice = read("apps/portal/features/auth/components/PortalLoginMaintenanceNotice.tsx");
  assert.match(loginNotice, /portal-maintenance-login-banner/);
  assert.match(loginNotice, /Maintenance mode is on/);
  assert.doesNotMatch(loginNotice, /testing access/i);
});
