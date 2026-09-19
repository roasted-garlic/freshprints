import assert from "node:assert/strict";
import test from "node:test";

import { resolveStaffArtworkPromotionMetadata } from "./staffArtworkPromotion";

const legacyDefaultStaffArtwork = {
  id: "legacy-staff-1",
  title: "dd043407ea",
  description: undefined,
  sourceFileName: "ChatGPT Image Sep 10, 2026, 09_48_31 PM.png",
  contentType: "image/png",
  status: "ready",
  sourceStoragePath: "/staff-artwork/legacy-staff-1/source",
  productionStoragePath: "/staff-artwork/legacy-staff-1/production.png",
  previewStoragePath: "/staff-artwork/legacy-staff-1/preview.webp",
  thumbnailStoragePath: "/staff-artwork/legacy-staff-1/thumbnail.webp",
  processing: { widthPx: 1000, heightPx: 1000 },
  promotionStatus: "not_promoted",
};

test("normalizes a real pre-corrective default-titled Staff Artwork record", () => {
  assert.deepEqual(resolveStaffArtworkPromotionMetadata(legacyDefaultStaffArtwork), {
    title: "dd043407ea",
    catalogTitleSource: "import_filename",
    importSourceFileName: "ChatGPT Image Sep 10, 2026, 09_48_31 PM.png",
  });
});

test("protects a legacy explicit title when provenance was omitted", () => {
  assert.deepEqual(
    resolveStaffArtworkPromotionMetadata({
      ...legacyDefaultStaffArtwork,
      title: "Staff Curated Highland Cow",
    }),
    {
      title: "Staff Curated Highland Cow",
      catalogTitleSource: "staff",
      importSourceFileName: "ChatGPT Image Sep 10, 2026, 09_48_31 PM.png",
    },
  );
});

test("preserves post-corrective staff authority and filename provenance", () => {
  assert.deepEqual(
    resolveStaffArtworkPromotionMetadata({
      ...legacyDefaultStaffArtwork,
      title: "Explicit New Title",
      catalogTitleSource: "staff",
    }),
    {
      title: "Explicit New Title",
      catalogTitleSource: "staff",
      importSourceFileName: "ChatGPT Image Sep 10, 2026, 09_48_31 PM.png",
    },
  );
});
