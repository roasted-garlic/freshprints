import assert from "node:assert/strict";
import test from "node:test";
import { Timestamp } from "firebase/firestore";

import {
  buildStaffArtworkProjectionEnrichment,
  projectPortalPrintRequestItem,
} from "./portalPrintRequestItemProjection";

const timestamps = { createdAt: Timestamp.fromMillis(1), updatedAt: Timestamp.fromMillis(2) };

test("staff artwork projection allowlists title preview pixels and strips private fields", () => {
  const enrichment = buildStaffArtworkProjectionEnrichment({
    title: "Cucumber Life",
    previewStoragePath: "staff-artwork/sa-1/preview.webp",
    thumbnailStoragePath: "staff-artwork/sa-1/thumbnail.webp",
    artworkBackgroundHex: "#111111",
    processing: { widthPx: 5000, heightPx: 4000, effectiveDpi: 300 },
    notes: "Private staff note",
    productionStoragePath: "staff-artwork/sa-1/production.png",
  });

  const projected = projectPortalPrintRequestItem(
    "item-1",
    {
      printRequestId: "request-1",
      sourceType: "staff_artwork",
      staffArtworkId: "sa-1",
      titleSnapshot: "Stale snapshot",
      notes: "Canonical note",
      quantity: 2,
      printWidthInches: 10,
      printHeightInches: 8,
      sizeLabel: "10 × 8 in",
      status: "pending",
      addedBy: "customer-1",
      ...timestamps,
    },
    enrichment,
  );

  assert.ok(projected);
  assert.equal(projected.sourceType, "staff_artwork");
  assert.equal(projected.sourceLabel, "Staff-added");
  assert.equal(projected.staffArtworkId, "sa-1");
  assert.equal(projected.titleSnapshot, "Cucumber Life");
  assert.equal(projected.previewStoragePath, "staff-artwork/sa-1/preview.webp");
  assert.equal(projected.thumbnailStoragePath, "staff-artwork/sa-1/thumbnail.webp");
  assert.equal(projected.widthPx, 5000);
  assert.equal(projected.heightPx, 4000);
  assert.equal(projected.artworkBackgroundHex, "#111111");
  assert.equal("notes" in projected, false);
  assert.equal("processing" in projected, false);
  assert.equal("productionStoragePath" in projected, false);
  assert.equal("artworkEnhanceMode" in projected, false);
});

test("staff artwork projection keeps the row when enrichment is missing", () => {
  const projected = projectPortalPrintRequestItem("item-missing", {
    printRequestId: "request-1",
    sourceType: "staff_artwork",
    staffArtworkId: "sa-missing",
    titleSnapshot: "Fallback title",
    quantity: 1,
    status: "pending",
    addedBy: "customer-1",
    ...timestamps,
  }, null);

  assert.ok(projected);
  assert.equal(projected.sourceLabel, "Staff-added");
  assert.equal(projected.staffArtworkId, "sa-missing");
  assert.equal(projected.titleSnapshot, "Fallback title");
  assert.equal(projected.previewStoragePath, undefined);
  assert.equal(projected.widthPx, undefined);
});

test("catalog and upload projections retain only their existing customer-safe identity", () => {
  const projected = projectPortalPrintRequestItem("item-2", {
    printRequestId: "request-1",
    sourceType: "catalog_design",
    designId: "design-1",
    titleSnapshot: "Catalog title",
    quantity: 1,
    status: "pending",
    addedBy: "customer-1",
    ...timestamps,
  });
  assert.deepEqual(
    { designId: projected?.designId, titleSnapshot: projected?.titleSnapshot, sourceType: projected?.sourceType },
    { designId: "design-1", titleSnapshot: "Catalog title", sourceType: "catalog_design" },
  );
  assert.equal("staffArtworkId" in (projected ?? {}), false);
  assert.equal("widthPx" in (projected ?? {}), false);
});
