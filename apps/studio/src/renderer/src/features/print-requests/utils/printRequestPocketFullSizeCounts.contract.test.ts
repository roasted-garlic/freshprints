import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

describe("pocket/full-size counts UI wiring", () => {
  it("PrintRequestsPage uses width-only helper and one compact list pill", () => {
    const source = readFileSync(join(here, "../pages/PrintRequestsPage.tsx"), "utf8");
    assert.match(source, /resolvePrintRequestPocketFullSizeCounts/);
    assert.match(source, /formatPocketFullSizeCountsLabel/);
    assert.doesNotMatch(source, /resolveGangSheetSizeClassCounts/);
    assert.doesNotMatch(source, /resolveGangSheetPriceTierForInches/);
    assert.match(source, /useShowQueueSettings/);
    assert.match(source, /useInternalGangSheetSettings/);
    assert.match(source, /print-requests-request-card-size-class/);
    assert.match(source, /\{sizeClassLabel\}/);
    assert.doesNotMatch(source, /Pocket \{sizeClassCounts\.pocketCount\}/);
  });

  it("UpcomingShowsPage uses width-only helper with active settings cutoff", () => {
    const source = readFileSync(join(here, "../../upcoming-shows/pages/UpcomingShowsPage.tsx"), "utf8");
    assert.match(source, /resolvePrintRequestPocketFullSizeCounts/);
    assert.match(source, /formatPocketFullSizeCountsLabel/);
    assert.match(source, /gangSheetLayoutSettings\.sectionPricing\.sizeCutoffInches/);
    assert.match(source, /resolveActiveGangSheetSettingsSource/);
    assert.doesNotMatch(source, /resolveGangSheetSizeClassCounts/);
  });
});

describe("print-requests detail scroll contract", () => {
  it("does not give .print-requests-main its own nested vertical scrollbar", () => {
    const css = readFileSync(
      join(here, "../../../styles/components/print-requests.css"),
      "utf8",
    );
    const mainBlockMatch = css.match(/\.print-requests-main\s*\{[^}]*\}/g) ?? [];
    assert.ok(mainBlockMatch.length >= 1, "expected .print-requests-main rule(s)");

    for (const block of mainBlockMatch) {
      assert.doesNotMatch(block, /overflow-y\s*:\s*auto/);
      assert.doesNotMatch(block, /overflow\s*:\s*auto/);
      assert.doesNotMatch(block, /max-height\s*:\s*calc\(100vh/);
    }
  });

  it("lets page-content-area--print-requests own outer vertical scroll like Internal Gang Sheets", () => {
    const layoutCss = readFileSync(join(here, "../../../styles/layout.css"), "utf8");
    assert.match(
      layoutCss,
      /\.page-content-area--print-requests\s*\{[^}]*overflow-y\s*:\s*auto/s,
    );
    assert.match(
      layoutCss,
      /\.page-content-area--print-requests\s*>\s*\.page-layout\.page-layout-shell\s*\{[^}]*height\s*:\s*auto/s,
    );
  });
});
