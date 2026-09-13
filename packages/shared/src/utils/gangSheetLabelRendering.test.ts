import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildGroupedSectionHeadingSvg,
  computeGroupedSectionLabelBandHeightPx,
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
      sheetWidthPx: 1200,
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
});
