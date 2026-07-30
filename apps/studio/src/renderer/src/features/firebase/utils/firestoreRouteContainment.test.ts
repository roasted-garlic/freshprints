import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function read(relativePath: string): string {
  return readFileSync(relativePath, "utf8");
}

describe("Phase 0 route read containment alignment", () => {
  it("keeps Inbox, Imports, and Show Queue free of taxonomy and catalog-design consumers", () => {
    const routeFiles = [
      "apps/studio/src/renderer/src/features/staff-inbox/pages/StaffInboxPage.tsx",
      "apps/studio/src/renderer/src/features/imports/pages/ImportsPage.tsx",
      "apps/studio/src/renderer/src/features/upcoming-shows/pages/UpcomingShowsPage.tsx",
    ];

    for (const routeFile of routeFiles) {
      const source = read(routeFile);
      assert.doesNotMatch(source, /useCatalogTags|useCategories|useDesigns|listReadyDesigns/);
    }
  });

  it("keeps Design Library bounded and avoids mounting the duplicate tag consumer while closed", () => {
    const source = read(
      "apps/studio/src/renderer/src/features/designs/pages/DesignLibraryPage.tsx",
    );

    assert.match(source, /useDesigns\(listQuery\)/);
    assert.doesNotMatch(source, /useDesigns\(listQuery,\s*\{\s*loadAll:\s*true/);
    assert.match(source, /isTagManagementModalOpen\s*\?\s*\(/);
  });

  it("keeps AI Review at one active page query plus one initial three-count pass", () => {
    const page = read(
      "apps/studio/src/renderer/src/features/ai-review/pages/AiReviewPage.tsx",
    );
    const counts = read(
      "apps/studio/src/renderer/src/features/ai-review/hooks/useAiReviewTabCounts.ts",
    );
    const inbox = read(
      "apps/studio/src/renderer/src/features/ai-review/hooks/useAiReviewInbox.ts",
    );

    assert.doesNotMatch(page, /statsRefreshKey|wasInboxLoadingRef/);
    assert.equal([...inbox.matchAll(/useDesigns\(listQuery\)/g)].length, 1);
    assert.doesNotMatch(inbox, /AI_REVIEW_TABS\.map|Promise\.all/);
    assert.match(counts, /AI_REVIEW_TABS\.map/);
    assert.deepEqual(
      [...counts.matchAll(/"processing"|"needs_review"|"rejected"/g)].map((match) => match[0]),
      ['"processing"', '"needs_review"', '"rejected"'],
    );
  });

  it("loads Print Request design documents only for selected item IDs", () => {
    const page = read(
      "apps/studio/src/renderer/src/features/print-requests/pages/PrintRequestsPage.tsx",
    );
    const hook = read(
      "apps/studio/src/renderer/src/features/print-requests/hooks/useReadyDesignsForSelection.ts",
    );

    assert.match(page, /useReadyDesignsForSelection\(selectedDesignIds\)/);
    assert.match(hook, /designService\.getDesignById/);
    assert.doesNotMatch(hook, /listReadyDesigns/);
  });

  it("bounds global Staff Inbox listeners and exposes cache outcomes to the trace", () => {
    const inbox = read(
      "apps/studio/src/renderer/src/features/staff-inbox/services/staffInboxSubscriptionService.ts",
    );
    const cache = read("packages/shared/src/utils/boundedAsyncCache.ts");
    const designs = read(
      "apps/studio/src/renderer/src/features/designs/services/designService.ts",
    );

    assert.match(inbox, /limit\(STAFF_INBOX_REQUEST_LIMIT\)/);
    assert.match(inbox, /limit\(STAFF_INBOX_ALLOCATION_LIMIT\)/);
    assert.match(inbox, /limit\(STAFF_INBOX_SHOW_LIMIT\)/);
    assert.match(cache, /options\.onEvent\?\.\("hit", key\)/);
    assert.match(cache, /failed\.has\(key\) \? "retry" : "miss"/);
    assert.match(designs, /traceFirestoreCacheEvent/);
  });

  it("uses one Print Requests URL authority and no competing local route state", () => {
    const page = read(
      "apps/studio/src/renderer/src/features/print-requests/pages/PrintRequestsPage.tsx",
    );

    assert.equal(
      [...page.matchAll(/navigate\(target, \{ replace: history === "replace" \}\)/g)].length,
      1,
    );
    assert.equal([...page.matchAll(/only effect allowed to normalize/g)].length, 1);
    assert.doesNotMatch(
      page,
      /setActiveListTab|setSelectedRequestId|replacePrintRequestsPath|updateSelectedRequestPath/,
    );
  });

  it("sets Studio trace route context during render before child effects", () => {
    const shell = read(
      "apps/studio/src/renderer/src/shared/components/AppShell.tsx",
    );

    assert.match(shell, /setFirestoreUsageTraceContext\(\{ app: "studio", route: location\.pathname \}\)/);
    assert.doesNotMatch(shell, /useEffect\(\(\) => \{\s*setFirestoreUsageTraceContext/);
  });

  it("keeps taxonomy caches session-long, caller/project scoped, and auth-invalidated", () => {
    const tags = read(
      "apps/studio/src/renderer/src/features/designs/services/catalogTagService.ts",
    );
    const categories = read(
      "apps/studio/src/renderer/src/features/designs/services/categoryService.ts",
    );
    const auth = read(
      "apps/studio/src/renderer/src/features/auth/context/AuthProvider.tsx",
    );

    for (const source of [tags, categories]) {
      assert.match(source, /12 \* 60 \* 60 \* 1000/);
      assert.match(source, /db\.app\.options\.projectId/);
      assert.match(source, /caller\.id/);
    }
    assert.match(auth, /clearStudioTaxonomyCaches\(\)/);
  });

  it("keeps Portal global providers and Help free of catalog hydration", () => {
    const providers = read("apps/portal/app/providers.tsx");
    const helpPage = read("apps/portal/app/(app)/help/page.tsx");
    const helpService = read(
      "apps/portal/features/help/services/portalHelpSettingsService.ts",
    );

    assert.doesNotMatch(providers, /useCatalogDesigns|catalogService/);
    assert.doesNotMatch(helpPage, /useCatalogDesigns|catalogService/);
    assert.doesNotMatch(helpService, /collection:\s*"tags"|collection:\s*"categories"|collection:\s*"designs"/);
  });
});
