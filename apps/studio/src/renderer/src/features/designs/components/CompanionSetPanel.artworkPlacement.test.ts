import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Static-source regression guard for the Companion Designs panel Placement editor (2026-08-10
 * amendment). `CompanionSetPanel` is Electron-renderer code with heavy Firebase/auth
 * dependencies that are impractical to mount in a Node test runner, so this asserts the wiring
 * directly from source — mirroring `companionSetService.wiring.test.ts` and
 * `DesignDetailsModal.companionPlacement.test.ts`.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function readSource(): string {
  return readFileSync(path.join(__dirname, "CompanionSetPanel.tsx"), "utf8");
}

describe("CompanionSetPanel Placement editor wiring", () => {
  it("imports the allowlisted Placement helpers and Select options", () => {
    const source = readSource();

    assert.match(source, /ARTWORK_PLACEMENT_SELECT_OPTIONS/);
    assert.match(source, /artworkPlacementLabel/);
    assert.match(source, /parseArtworkPlacement/);
    assert.match(source, /from "..\/constants\/artworkPlacement"/);
  });

  it("renders both the anchor design and its neighbors as member cards", () => {
    const source = readSource();

    assert.match(source, /const members = isLinked \? \[design, \.\.\.neighbors\] : \[\];/);
    assert.match(source, /members\.map\(/);
  });

  it("shows an editable Placement Select for staff, and a read-only badge otherwise (not both)", () => {
    const source = readSource();

    const placementRowMatch = source.match(
      /design-companion-member-placement-row[\s\S]*?<\/div>\s*<\/div>/,
    );
    assert.ok(placementRowMatch, "Expected a Placement row rendered per member card.");
    assert.match(placementRowMatch[0], /canEdit \? \(/);
    assert.match(placementRowMatch[0], /<Select/);
    assert.match(placementRowMatch[0], /options=\{ARTWORK_PLACEMENT_SELECT_OPTIONS\}/);
    assert.match(placementRowMatch[0], /artworkPlacementLabel\(member\.artworkPlacement\)/);
    // Staff path must not also render the redundant presentation Badge beside the Select.
    assert.equal(
      /canEdit \? \([\s\S]*?<Badge[\s\S]*?<Select/.test(placementRowMatch[0]),
      false,
    );
  });

  it("updates only artworkPlacement on the member's own document — never status or companionDesignIds", () => {
    const source = readSource();
    const handlerMatch = source.match(
      /async function handleMemberPlacementChange[\s\S]*?\n {2}\}\n/,
    );

    assert.ok(handlerMatch, "Expected to find handleMemberPlacementChange in the source.");
    const handlerBody = handlerMatch[0];

    assert.match(handlerBody, /designService\.updateDesign\(user, member\.id, \{\s*artworkPlacement: nextPlacement,?\s*\}\)/);
    assert.equal(handlerBody.includes("status:"), false);
    assert.equal(handlerBody.includes("companionDesignIds"), false);
  });

  it("refreshes the anchor via onCompanionsChanged and patches neighbor state locally, without a full reload", () => {
    const source = readSource();
    const handlerMatch = source.match(
      /async function handleMemberPlacementChange[\s\S]*?\n {2}\}\n/,
    );

    assert.ok(handlerMatch);
    const handlerBody = handlerMatch[0];

    assert.match(handlerBody, /if \(member\.id === design\.id\) \{\s*onCompanionsChanged\?\.\(updated\);/);
    assert.match(handlerBody, /setNeighbors\(\(currentNeighbors\) =>/);
    assert.equal(handlerBody.includes("reloadNeighbors()"), false);
    assert.equal(handlerBody.includes("refreshAnchorDesign()"), false);
  });
});
