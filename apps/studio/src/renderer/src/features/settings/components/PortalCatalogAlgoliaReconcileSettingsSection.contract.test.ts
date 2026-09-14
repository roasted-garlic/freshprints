import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const componentSource = readFileSync(
  "apps/studio/src/renderer/src/features/settings/components/PortalCatalogAlgoliaReconcileSettingsSection.tsx",
  "utf8",
);
const settingsPageSource = readFileSync(
  "apps/studio/src/renderer/src/features/settings/pages/SettingsPage.tsx",
  "utf8",
);
const reconcileServiceSource = readFileSync(
  "apps/studio/src/renderer/src/features/designs/services/portalCatalogAlgoliaReconcileAdminService.ts",
  "utf8",
);
const searchServiceSource = readFileSync(
  "apps/studio/src/renderer/src/features/designs/services/studioAlgoliaCatalogSearchService.ts",
  "utf8",
);

describe("Portal Catalog Algolia reconcile Settings control", () => {
  it("mounts under the owner/admin AI Enrichment Settings surface", () => {
    assert.match(settingsPageSource, /algoliaReconcile/);
    assert.match(settingsPageSource, /PortalCatalogAlgoliaReconcileSettingsSection/);
    assert.match(settingsPageSource, /resolvedTab === "aiEnrichment" && canViewAdministrativeSettings/);
    assert.match(componentSource, /canViewAdministrativeSettings\(user\)/);
  });

  it("uses the reviewed production target and fails closed on target mismatch", () => {
    assert.match(reconcileServiceSource, /projectId: "fresh-prints-prod"/);
    assert.match(reconcileServiceSource, /appId: "Z1FVCM5QUX"/);
    assert.match(reconcileServiceSource, /indexName: "portal_catalog_ready_prod"/);
    assert.match(componentSource, /!target\.isProductionTarget/);
    assert.match(componentSource, /Preview and Apply are\s+disabled/);
  });

  it("runs a read-only dry-run Preview and displays callable counts plus search-only nbHits", () => {
    assert.match(componentSource, /reconcilePortalCatalogAlgoliaIndex\(\{ dryRun: true \}\)/);
    assert.match(componentSource, /getCurrentIndexHitCount\(\)/);
    assert.match(componentSource, /Firestore Ready designs scanned/);
    assert.match(componentSource, /Current Algolia hits/);
    assert.match(componentSource, /search-only/);
    assert.match(searchServiceSource, /searchSingleIndex\(\{[\s\S]*hitsPerPage: 0/);
    assert.match(searchServiceSource, /response\.nbHits/);
  });

  it("shows the proposed contract without exposing live settings or legacy tag authority", () => {
    assert.match(componentSource, /Proposed APPLY contract/);
    assert.match(componentSource, /not a live-settings read/);
    assert.match(componentSource, /PORTAL_CATALOG_ALGOLIA_SEARCHABLE_ATTRIBUTES/);
    assert.match(componentSource, /PORTAL_CATALOG_ALGOLIA_ATTRIBUTES_FOR_FACETING/);
    assert.match(componentSource, /Legacy[\s\S]*tag fields/);
    assert.doesNotMatch(componentSource, /ALGOLIA_ADMIN_API_KEY|adminApiKey|searchOnlyApiKey/);
  });

  it("requires a current Preview and explicit confirmation before Apply", () => {
    assert.match(componentSource, /preview\.response\.dryRun === true/);
    assert.match(componentSource, /preview\.response\.cleared === false/);
    assert.match(componentSource, /hasFiniteReconcileCounts\(preview\.response\)/);
    assert.match(componentSource, /Explicit Apply confirmation/);
    assert.match(componentSource, /disabled=\{!previewIsCurrent \|\| !applyConfirmed \|\| isBusy\}/);
    assert.match(componentSource, /reconcilePortalCatalogAlgoliaIndex\(\{ dryRun: false \}\)/);
    assert.match(componentSource, /response\.dryRun \|\| !response\.cleared/);
  });

  it("protects single-flight requests and invalidates ephemeral Preview authorization", () => {
    assert.match(componentSource, /inFlightRef = useRef\(false\)/);
    assert.match(componentSource, /if \(.*inFlightRef\.current\)/);
    assert.match(componentSource, /inFlightRef\.current = true/);
    assert.match(componentSource, /inFlightRef\.current = false/);
    assert.match(componentSource, /setPreview\(null\)/);
    assert.match(componentSource, /setApplyConfirmed\(false\)/);
    assert.match(componentSource, /return \(\) => \{[\s\S]*mountedRef\.current = false/);
    assert.match(componentSource, /Require a new Preview before another APPLY/);
    assert.match(componentSource, /const latestTarget = getPortalCatalogAlgoliaReconcileTarget\(\);[\s\S]*?setPreview\(\{ targetKey, response, currentHitCount \}\)/);
  });

  it("keeps the existing DEV-only console bridge separate", () => {
    assert.match(reconcileServiceSource, /installPortalCatalogAlgoliaReconcileAdminConsole/);
    assert.match(reconcileServiceSource, /isFirebaseDebugPanelEnabled/);
    assert.match(reconcileServiceSource, /window\.freshPrintsDev/);
  });
});
