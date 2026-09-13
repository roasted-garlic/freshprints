import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const rules = readFileSync("firestore.rules", "utf8");
const storageRules = readFileSync("storage.rules", "utf8");
const portalMapper = readFileSync(
  "apps/portal/features/print-requests/services/portalPrintRequestService.ts",
  "utf8",
);
const portalDetail = readFileSync(
  "apps/portal/app/(app)/requests/[id]/PrintRequestDetailView.tsx",
  "utf8",
);
const portalCard = readFileSync(
  "apps/portal/features/print-requests/components/PortalPrintRequestItemCard.tsx",
  "utf8",
);
const currentRequestDrawer = readFileSync(
  "apps/portal/features/print-requests/components/CurrentRequestDrawer.tsx",
  "utf8",
);
const queueToShow = readFileSync(
  "apps/portal/features/print-requests/components/PortalQueueToShowModal.tsx",
  "utf8",
);

describe("Staff Artwork security contracts", () => {
  it("keeps Staff Artwork document writes denied and list staff-only", () => {
    assert.match(rules, /match \/staffArtworks\/\{staffArtworkId\}/);
    assert.match(rules, /allow list: if isStaff\(\);/);
    assert.match(rules, /allow create, update, delete: if false;/);
    assert.match(rules, /match \/portalPrintRequestItems\/\{itemId\}/);
    assert.match(storageRules, /match \/staff-artwork\/\{staffArtworkId\}\/\{fileName\}/);
    assert.match(storageRules, /fileName == "source"/);
    assert.match(storageRules, /fileName in \["preview\.webp", "thumbnail\.webp"\]/);
    assert.match(storageRules, /isCustomer\(\)/);
  });

  it("keeps Portal off staffArtworks docs while allowing projected title/preview/DPI fields", () => {
    assert.doesNotMatch(portalMapper, /collection\(getPortalDb\(\),\s*['"]staffArtworks['"]/);
    assert.doesNotMatch(portalMapper, /doc\(getPortalDb\(\),\s*['"]staffArtworks['"]/);
    assert.match(portalMapper, /portalPrintRequestItems/);
    assert.match(portalMapper, /else if \(!isStaffArtworkItem && !designId\)/);
    assert.match(portalMapper, /staffArtworkId/);
    assert.match(portalMapper, /previewStoragePath/);
    assert.match(portalMapper, /widthPx/);

    assert.match(portalDetail, /item\.previewStoragePath/);
    assert.match(portalCard, /const isStaffArtworkItem = item\.sourceType === 'staff_artwork'/);
    assert.match(portalCard, /Staff-added/);
    assert.match(portalCard, /item\.titleSnapshot/);
    assert.match(portalCard, /item\.widthPx/);
    assert.doesNotMatch(portalCard, /getStaffArtworkPreviewStoragePath/);
    assert.doesNotMatch(currentRequestDrawer, /getStaffArtworkPreviewStoragePath/);
    assert.match(currentRequestDrawer, /item\.titleSnapshot/);
    assert.match(queueToShow, /item\.titleSnapshot/);
  });
});
