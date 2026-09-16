import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function read(rel: string): string {
  return readFileSync(rel, "utf8");
}

describe("Design Library full-card AI multiple-select contracts", () => {
  it("toggles selection from the card button and opens details only in normal mode", () => {
    const card = read(
      "apps/studio/src/renderer/src/features/designs/components/DesignCard.tsx",
    );
    assert.match(card, /aria-pressed=\{[\s\S]*isAiReprocessSelectable[\s\S]*isSelectedForAiReprocess/);
    assert.match(
      card,
      /onToggleAiReprocessSelection\s*\?\s*onToggleAiReprocessSelection\(design\)\s*:\s*onSelect\(design\)/s,
    );
    assert.match(card, /className="card design-card"/);
    assert.match(card, /type="button"/);
  });

  it("passes the toggle callback only while AI multiple-select is active", () => {
    const grid = read(
      "apps/studio/src/renderer/src/features/designs/components/DesignGrid.tsx",
    );
    const page = read(
      "apps/studio/src/renderer/src/features/designs/pages/DesignLibraryPage.tsx",
    );
    assert.match(grid, /aiReprocessSelection\?\.onToggle/);
    assert.match(grid, /isAiReprocessSelectable=\{aiReprocessEligible\}/);
    assert.match(page, /isAiMultiSelectMode\s*\?\s*\{/);
    assert.match(page, /onToggle: toggleAiDesignSelection/);
    assert.match(page, /isAiMultiSelectMode\s*\?\s*\{[\s\S]*\}\s*:\s*undefined/);
    assert.match(page, /removeDesignFromList\(designId\)/);
    assert.match(page, /status: "imported"/);
    assert.match(page, /aiReviewStatus: "pending"/);
  });
});
