import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  PRINT_REQUEST_INTERNAL_LIST_TABS,
  PRINT_REQUEST_LIST_TABS,
} from "../constants/printRequestRoutes";

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
  it("gives every Customer/Internal lifecycle tab only a bounded detail-pane scrollbar", () => {
    const source = readFileSync(join(here, "../pages/PrintRequestsPage.tsx"), "utf8");
    assert.match(source, /className="print-requests-layout"[\s\S]*data-print-request-kind=\{activeListKind\}/);
    assert.match(source, /className="print-requests-layout"[\s\S]*data-print-request-tab=\{activeListTab\}/);

    for (const tab of PRINT_REQUEST_LIST_TABS) {
      assert.ok(
        tab === "printed"
          ? source.includes(": \"Printed\"}")
          : source.includes(`tab === "${tab}"`),
        `expected ${tab} status rendering`,
      );
    }
    assert.deepEqual([...PRINT_REQUEST_LIST_TABS], ["working", "editing", "queued", "printing", "printed"]);
    assert.deepEqual([...PRINT_REQUEST_INTERNAL_LIST_TABS], ["working", "editing", "queued", "printed"]);
    assert.match(source, /getPrintRequestListTabsForKind\(activeListKind\)/);

    const css = readFileSync(
      join(here, "../../../styles/components/print-requests.css"),
      "utf8",
    );
    assert.match(css, /\.page-content-area--print-requests\s+\.print-requests-main\s*\{[^}]*overflow-y\s*:\s*auto/s);
    assert.match(
      css,
      /\.page-content-area--print-requests\s+\.print-requests-main\s*\{[^}]*max-height\s*:\s*100%[^}]*min-height\s*:\s*0[^}]*overflow-y\s*:\s*auto/s,
    );
    assert.match(css, /\.page-content-area--print-requests\s+\.print-requests-main\s*\{[^}]*overscroll-behavior\s*:\s*contain/s);
    assert.match(
      css,
      /\.page-content-area--print-requests\s+\.print-requests-layout\s*\{[^}]*align-items\s*:\s*stretch[^}]*height\s*:\s*0[^}]*overflow\s*:\s*hidden/s,
    );
    assert.match(
      css,
      /\.page-content-area--print-requests\s+\.print-requests-layout\s*\{[^}]*grid-template-rows\s*:\s*minmax\(0,\s*1fr\)/s,
    );
    assert.match(
      css,
      /\.page-content-area--print-requests\s+\.print-requests-rail\s*\{[^}]*max-height\s*:\s*100%[^}]*position\s*:\s*relative/s,
    );
    assert.match(css, /\.print-requests-rail-list\s*\{[^}]*overflow-y\s*:\s*auto/s);
    assert.doesNotMatch(css, /\.page-content-area--show-queue\s+\.print-requests-main\s*\{[^}]*overflow-y\s*:\s*auto/s);
  });

  it("preserves the two-row stacked contract at narrow widths so editable Working/Editing details cannot expand the outer shell", () => {
    const css = readFileSync(
      join(here, "../../../styles/components/print-requests.css"),
      "utf8",
    );
    assert.match(
      css,
      /@media\s*\(max-width:\s*1024px\)\s*\{[\s\S]*?\.page-content-area--print-requests\s+\.print-requests-layout\s*\{[^}]*grid-template-columns:\s*1fr[^}]*grid-template-rows:\s*auto\s+minmax\(0,\s*1fr\)/s,
    );
    assert.match(
      css,
      /@media\s*\(max-width:\s*1024px\)\s*\{[\s\S]*?\.print-requests-layout\s*\{[^}]*grid-template-columns:\s*1fr[^}]*grid-template-rows:\s*auto\s+minmax\(0,\s*1fr\)/s,
    );
  });

  it("constrains the Print Requests shell and disables its outer scroll", () => {
    const layoutCss = readFileSync(join(here, "../../../styles/layout.css"), "utf8");
    const navigationCss = readFileSync(join(here, "../../../styles/components/navigation.css"), "utf8");
    const utilitiesCss = readFileSync(join(here, "../../../styles/utilities.css"), "utf8");
    const printRequestsCss = readFileSync(
      join(here, "../../../styles/components/print-requests.css"),
      "utf8",
    );
    assert.match(
      layoutCss,
      /\.app-main\s*>\s*\.page-content-area\.page-content-area--print-requests\s*\{[^}]*overflow\s*:\s*hidden\s*!important/s,
    );
    assert.match(
      navigationCss,
      /\.app-main\s*>\s*\.page-content-area\.page-content-area--print-requests\s*\{[^}]*overflow\s*:\s*hidden\s*!important/s,
    );
    // Final cascade kill-switch lives in utilities.css (imported last).
    assert.match(
      utilitiesCss,
      /\.app-main\s*>\s*\.page-content-area\.page-content-area--print-requests\s*\{[^}]*overflow-y\s*:\s*hidden\s*!important/s,
    );
    assert.match(
      utilitiesCss,
      /\.app-main\s*>\s*\.page-content-area\.page-content-area--print-requests\s+\.print-requests-main\s*\{[^}]*overflow-y\s*:\s*auto\s*!important/s,
    );
    assert.match(
      utilitiesCss,
      /@media\s*\(max-width:\s*1024px\)[\s\S]*?\.app-main\s*>\s*\.page-content-area\.page-content-area--print-requests\s+\.print-requests-layout\s*\{[^}]*grid-template-rows\s*:\s*auto\s+minmax\(0,\s*1fr\)\s*!important/s,
    );
    assert.match(
      utilitiesCss,
      /@media\s*\(max-width:\s*1024px\)[\s\S]*?\.app-main\s*>\s*\.page-content-area\.page-content-area--print-requests\s+\.print-requests-rail\s*\{[^}]*max-height\s*:\s*min\(38vh,\s*calc\(100vh\s*-\s*10rem\)\)\s*!important/s,
    );
    // Legacy height:auto must not remain the Print Requests default (Show Queue opts in).
    assert.match(
      printRequestsCss,
      /\.page-content-area--show-queue\s+\.print-requests-layout\s*\{[^}]*height\s*:\s*auto/s,
    );
    const baseLayoutMatch = printRequestsCss.match(/^(?:(?!\.page-content-area--show-queue)[\s\S])*?\.print-requests-layout\s*\{([^}]*)\}/m);
    assert.ok(baseLayoutMatch, "expected a base .print-requests-layout rule");
    assert.doesNotMatch(baseLayoutMatch[1], /height\s*:\s*auto/);
    assert.match(
      printRequestsCss,
      /\.page-content-area--print-requests\s+\.print-requests-layout\s*\{[^}]*height\s*:\s*0/s,
    );
    assert.match(
      layoutCss,
      /\.app-main\s*>\s*\.page-content-area\.page-content-area--print-requests\s*>\s*\.page-layout\.page-layout-shell\s*\{[^}]*height\s*:\s*0[^}]*overflow\s*:\s*hidden/s,
    );
    assert.doesNotMatch(
      layoutCss,
      /\.page-content-area--print-requests\s*,\s*\.page-content-area--show-queue\s*\{[^}]*overflow-y\s*:\s*auto/s,
    );
    assert.match(
      layoutCss,
      /\.page-content-area--show-queue\s*\{[^}]*overflow-y\s*:\s*auto/s,
    );
  });
});
