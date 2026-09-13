import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { resolve } from "node:path";

import { validatePortalAdminUpcomingShowQueueDashboardRequest } from "./lib/portalAdminUpcomingShowQueueDashboard";
import { validatePortalAdminShowQueueRequestDesignsRequest } from "./lib/portalAdminShowQueueRequestDesigns";

describe("portal admin dashboard contracts", () => {
  const designsFunctionSource = readFileSync(
    resolve(import.meta.dirname, "getPortalAdminShowQueueRequestDesigns.ts"),
    "utf8",
  );

  it("accepts empty or showId-only dashboard requests", () => {
    assert.deepEqual(validatePortalAdminUpcomingShowQueueDashboardRequest({}), {});
    assert.deepEqual(validatePortalAdminUpcomingShowQueueDashboardRequest({ showId: "abc" }), {
      showId: "abc",
    });
    assert.throws(() => validatePortalAdminUpcomingShowQueueDashboardRequest({ showId: "abc", extra: true }));
    assert.throws(() => validatePortalAdminUpcomingShowQueueDashboardRequest({ showId: "  " }));
  });

  it("requires showId and printRequestId only for designs", () => {
    assert.deepEqual(
      validatePortalAdminShowQueueRequestDesignsRequest({ showId: "s1", printRequestId: "p1" }),
      { showId: "s1", printRequestId: "p1" },
    );
    assert.throws(() => validatePortalAdminShowQueueRequestDesignsRequest({ showId: "s1" }));
    assert.throws(() =>
      validatePortalAdminShowQueueRequestDesignsRequest({
        showId: "s1",
        printRequestId: "p1",
        path: "/evil",
      }),
    );
  });

  it("resolves design artwork in parallel instead of serially per allocation", () => {
    assert.match(designsFunctionSource, /Promise\.all\(/);
    assert.match(designsFunctionSource, /resolveArtworkPreview/);
    assert.match(designsFunctionSource, /previewPath/);
    assert.match(designsFunctionSource, /artworkBackgroundHex/);
    assert.doesNotMatch(designsFunctionSource, /for \(const allocation of activeAllocations\)/);
  });

  it("labels catalog rows as Design Library and prefers preview derivatives", () => {
    assert.match(designsFunctionSource, /resolveCatalogArtworkAsset/);
    assert.match(
      designsFunctionSource,
      /nonEmptyStringExport\(data\.previewPath\) \?\? nonEmptyStringExport\(data\.thumbnailPath\)/,
    );
    const dashboardLib = readFileSync(
      resolve(import.meta.dirname, "lib/portalAdminUpcomingShowQueueDashboard.ts"),
      "utf8",
    );
    assert.match(dashboardLib, /"Design Library"/);
    assert.match(dashboardLib, /"Uploaded"/);
    assert.doesNotMatch(dashboardLib, /designTitleSnapshot/);
    assert.doesNotMatch(dashboardLib, /"Customer upload"/);
  });

  it("formats customer identity with display name and live customer fallback", () => {
    const dashboardLib = readFileSync(
      resolve(import.meta.dirname, "lib/portalAdminUpcomingShowQueueDashboard.ts"),
      "utf8",
    );
    const dashboardCallable = readFileSync(
      resolve(import.meta.dirname, "getPortalAdminUpcomingShowQueueDashboard.ts"),
      "utf8",
    );
    assert.match(dashboardLib, /formatCustomerIdentityLabel/);
    assert.match(dashboardLib, /customerDisplayNameSnapshot/);
    assert.match(dashboardLib, /customers\.get\(customerId\)/);
    assert.match(dashboardCallable, /collection\("customers"\)/);
    assert.match(dashboardCallable, /customers: customerMap/);
  });
});
