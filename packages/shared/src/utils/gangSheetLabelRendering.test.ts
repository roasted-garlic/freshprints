import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildGroupedSectionHeadingSvg,
  computeGangSheetLabelBandHeightPx,
  computeGroupedSectionLabelBandHeightPx,
  measureGangSheetTextWidthPx,
  resolveGangSheetLabelLayout,
  resolveGroupedSectionLabelLayout,
  resolveGroupedSectionLabelFontSizePx,
} from "./gangSheetLabelRendering";

describe("gang sheet grouped label rendering", () => {
  it("allocates space for independent price and weight lines", () => {
    const oneLineHeight = computeGroupedSectionLabelBandHeightPx(100, 50, 1);
    const twoLineHeight = computeGroupedSectionLabelBandHeightPx(100, 50, 2);

    assert.equal(oneLineHeight, 558);
    assert.equal(twoLineHeight, 626);
  });

  it("renders price and weight as separate summary lines", () => {
    const svg = buildGroupedSectionHeadingSvg({
      heading: "roasted_garlic-CR004 — 1 of 1",
      summaryLines: ["$2 x 4 + $1 x 2 = $10", "Weight: 0.75oz x 4 + 0.4oz x 2 = 3.8 oz"],
      sheetWidthPx: 600,
      bandHeightPx: computeGroupedSectionLabelBandHeightPx(100, 50),
      headingFontSizePx: 100,
      summaryFontSizePx: 50,
    });

    assert.match(svg, /\$2 x 4 \+ \$1 x 2 = \$10/);
    assert.match(svg, /Weight: 0\.75oz x 4 \+ 0\.4oz x 2 = 3\.8 oz/);
    assert.equal((svg.match(/font-weight="normal"/g) ?? []).length, 2);
    assert.match(svg, /y="228"/);
    assert.match(svg, /y="296"/);
  });

  it("uses a compact summary font so long calculations have more room", () => {
    assert.equal(resolveGroupedSectionLabelFontSizePx(100), 75);
  });

  it("shrinks long labels to 20px before wrapping them", () => {
    const layout = resolveGangSheetLabelLayout({
      label: "customer-with-a-very-long-print-request-name-that-must-fit",
      sheetWidthPx: 360,
      sideMarginPx: 30,
      labelFontSizePx: 100,
    });

    assert.equal(layout.fontSizePx, 20);
    assert.ok(layout.lines.length > 1);
    assert.ok(
      layout.lines.every(
        (line) => measureGangSheetTextWidthPx(line, layout.fontSizePx, "bold") <= layout.usableWidthPx,
      ),
    );
    assert.ok(layout.bandHeightPx > computeGangSheetLabelBandHeightPx(layout.fontSizePx));
  });

  it("splits an unbroken token deterministically", () => {
    const first = resolveGangSheetLabelLayout({
      label: "UNBREAKABLETOKENWITHOUTSPACES",
      sheetWidthPx: 360,
      sideMarginPx: 30,
      labelFontSizePx: 48,
    });
    const second = resolveGangSheetLabelLayout({
      label: "UNBREAKABLETOKENWITHOUTSPACES",
      sheetWidthPx: 360,
      sideMarginPx: 30,
      labelFontSizePx: 48,
    });

    assert.deepEqual(first.lines, second.lines);
    assert.ok(first.lines.length > 1);
    assert.ok(first.lines.every((line) => line.length > 0));
  });

  it("uses conservative width for wide lowercase glyphs", () => {
    const wideLowercaseWidth = measureGangSheetTextWidthPx("wwwwmmmm", 100, "bold");
    const narrowLowercaseWidth = measureGangSheetTextWidthPx("iiiiiiii", 100, "bold");
    const layout = resolveGangSheetLabelLayout({
      label: "wwwwmmmmwwwwmmmm",
      sheetWidthPx: 600,
      sideMarginPx: 75,
      labelFontSizePx: 100,
    });

    assert.ok(wideLowercaseWidth > narrowLowercaseWidth);
    assert.ok(layout.lines.every((line) => measureGangSheetTextWidthPx(line, layout.fontSizePx) <= layout.usableWidthPx));
  });

  it("keeps Unicode grapheme clusters intact while splitting long tokens", () => {
    const label = "漢字漢字漢字漢字漢字👩‍💻👩‍💻";
    const layout = resolveGangSheetLabelLayout({
      label,
      sheetWidthPx: 300,
      sideMarginPx: 30,
      labelFontSizePx: 48,
    });

    assert.equal(layout.fontSizePx, 20);
    assert.equal(layout.lines.join(""), label);
    assert.ok(layout.lines.every((line) => !line.startsWith("\u200d") && !line.endsWith("\u200d")));
    assert.ok(layout.lines.every((line) => measureGangSheetTextWidthPx(line, layout.fontSizePx) <= layout.usableWidthPx));
  });

  it("shares grouped heading geometry between band calculation and SVG output", () => {
    const layout = resolveGroupedSectionLabelLayout({
      heading: "customer-with-a-long-name, another-long-request-name",
      summaryLines: ["Price: $2 x 4 = $8", "Weight: 1oz x 4 = 4 oz"],
      sheetWidthPx: 900,
      sideMarginPx: 75,
      headingFontSizePx: 100,
      summaryFontSizePx: 50,
    });
    const svg = buildGroupedSectionHeadingSvg({
      heading: layout.heading.text,
      summaryLines: layout.summaries.map((summary) => summary.text),
      sheetWidthPx: 900,
      bandHeightPx: layout.bandHeightPx,
      headingFontSizePx: 100,
      summaryFontSizePx: 50,
      layout,
    });

    assert.equal((svg.match(/font-weight="bold"/g) ?? []).length, layout.heading.lines.length);
    assert.equal((svg.match(/font-weight="normal"/g) ?? []).length, layout.summaries.reduce((sum, summary) => sum + summary.lines.length, 0));
    assert.match(svg, /height="[0-9]+"/);
    assert.ok(layout.bandHeightPx > 0);
  });
});
