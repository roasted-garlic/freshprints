import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("functions/src/onStaffArtworkPortalProjectionRefreshWritten.ts", "utf8");

test("Staff Artwork portal projection refresh is Admin-owned", () => {
  assert.match(source, /onDocumentWritten/);
  assert.match(source, /staffArtworks\/\{staffArtworkId\}/);
  assert.match(source, /refreshPortalProjectionsForStaffArtwork/);
});
