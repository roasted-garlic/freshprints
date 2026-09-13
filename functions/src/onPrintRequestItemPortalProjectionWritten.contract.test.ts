import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const trigger = readFileSync("functions/src/onPrintRequestItemPortalProjectionWritten.ts", "utf8");
const sync = readFileSync("functions/src/lib/portalPrintRequestItemProjectionSync.ts", "utf8");
const refresh = readFileSync("functions/src/onStaffArtworkPortalProjectionRefreshWritten.ts", "utf8");

test("Portal request-item projection trigger is Admin-owned and allowlisted", () => {
  assert.match(trigger, /onDocumentWritten/);
  assert.match(trigger, /printRequestItems\/\{itemId\}/);
  assert.match(trigger, /writePortalPrintRequestItemProjection/);
  assert.doesNotMatch(trigger, /getDoc/);
});

test("projection sync Admin-enriches Staff Artwork through the shared allowlist mapper", () => {
  assert.match(sync, /staffArtworks/);
  assert.match(sync, /buildStaffArtworkProjectionEnrichment/);
  assert.match(sync, /projectPortalPrintRequestItem/);
  assert.match(sync, /portalPrintRequestItems/);
  assert.match(sync, /where\("staffArtworkId"/);
  assert.doesNotMatch(sync, /productionStoragePath/);
  assert.doesNotMatch(sync, /\.notes\b/);
});

test("Staff Artwork refresh trigger reprojects attached request items", () => {
  assert.match(refresh, /staffArtworks\/\{staffArtworkId\}/);
  assert.match(refresh, /refreshPortalProjectionsForStaffArtwork/);
});
