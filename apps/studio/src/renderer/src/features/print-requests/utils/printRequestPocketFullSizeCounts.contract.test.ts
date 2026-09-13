import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

describe("four-tier size counts UI wiring", () => {
  it("PrintRequestsPage keeps the compact list card focused on request totals", () => {
    const source = readFileSync(join(here, "../pages/PrintRequestsPage.tsx"), "utf8");
    assert.doesNotMatch(source, /resolvePrintRequestSizeClassCounts/);
    assert.doesNotMatch(source, /formatPrintRequestSizeClassCountsLabel/);
    assert.doesNotMatch(source, /resolveGangSheetSizeClassCounts/);
    assert.match(source, /useGangSheetSettings/);
    assert.doesNotMatch(source, /print-requests-request-card-size-class/);
    assert.doesNotMatch(source, /sizeClassLabel/);
    assert.doesNotMatch(source, /Full Size/);
  });

  it("UpcomingShowsPage uses the canonical four-tier helper for show and internal cards", () => {
    const source = readFileSync(join(here, "../../upcoming-shows/pages/UpcomingShowsPage.tsx"), "utf8");
    assert.match(source, /resolvePrintRequestSizeClassCounts/);
    assert.match(source, /formatPrintRequestSizeClassCountsLabel/);
    assert.match(source, /sectionPricing:\s*gangSheetSettings\.settings\.sectionPricing/);
    assert.doesNotMatch(source, /resolveActiveGangSheetSettingsSource/);
    assert.doesNotMatch(source, /resolveGangSheetSizeClassCounts/);
    assert.doesNotMatch(source, /Full Size/);
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
