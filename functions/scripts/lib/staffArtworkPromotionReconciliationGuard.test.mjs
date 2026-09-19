import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyStaffArtworkPromotionReconciliation,
} from "./staffArtworkPromotionReconciliationGuard.mjs";

const legacyStaffArtwork = {
  title: "a1b2c3d4e5",
  sourceFileName: "HighlandCow.png",
  catalogTitleSource: undefined,
  previewStoragePath: "/staff-artwork/staff-1/preview.webp",
  thumbnailStoragePath: "/staff-artwork/staff-1/thumbnail.webp",
};

test("classifies a legacy generated title and recoverable canonical repairs", () => {
  const result = classifyStaffArtworkPromotionReconciliation({
    design: {
      id: "design-1",
      title: "a1b2c3d4e5",
      catalogTitleSource: "staff",
      sourceStaffArtworkId: "staff-1",
      aiSuggestions: { title: "Highland Cow Hot Mess" },
    },
    staffArtwork: legacyStaffArtwork,
    assets: {
      canonicalPreview: false,
      canonicalThumbnail: false,
      staffPreview: true,
      staffThumbnail: true,
    },
  });

  assert.equal(result.kind, "repairable");
  assert.deepEqual(result.patch, {
    importSourceFileName: "HighlandCow.png",
    title: "Highland Cow Hot Mess",
    catalogTitleSource: "ai_generated",
    copyPreview: true,
    copyThumbnail: true,
  });
});

test("does not replace an ambiguous human-looking legacy title", () => {
  const result = classifyStaffArtworkPromotionReconciliation({
    design: {
      id: "design-2",
      title: "Staff Curated Cow",
      catalogTitleSource: "staff",
      sourceStaffArtworkId: "staff-2",
      aiSuggestions: { title: "AI Cow Title" },
    },
    assets: { canonicalPreview: true, canonicalThumbnail: true },
  });

  assert.equal(result.kind, "ambiguous");
  assert.equal(result.patch.title, undefined);
  assert.ok(result.reasons.includes("title_authority_ambiguous"));
});

test("is idempotent after the legacy Design has its import filename", () => {
  const result = classifyStaffArtworkPromotionReconciliation({
    design: {
      id: "design-3",
      title: "AI Cow Title",
      catalogTitleSource: "ai_generated",
      sourceStaffArtworkId: "staff-3",
      importSourceFileName: "Cow.png",
    },
    assets: { canonicalPreview: true, canonicalThumbnail: true },
  });

  assert.equal(result.kind, "not_candidate");
  assert.deepEqual(result.patch, {});
});

test("reports missing derivatives when the private source is already gone", () => {
  const result = classifyStaffArtworkPromotionReconciliation({
    design: {
      id: "design-4",
      title: "AI-Curated Title",
      catalogTitleSource: "ai_generated",
      sourceStaffArtworkId: "staff-4",
    },
    assets: { canonicalPreview: false, canonicalThumbnail: false },
  });

  assert.equal(result.kind, "unrecoverable");
  assert.deepEqual(result.patch, {});
  assert.ok(result.reasons.includes("preview_unrecoverable"));
  assert.ok(result.reasons.includes("thumbnail_unrecoverable"));
});
