import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  interleaveGroups,
  nestBoxesIntoShelves,
  nestBoxesIntoShelvesWithHeightCap,
  type NestableBox,
  type NestingSpacingPx,
} from "./gangSheetNesting";

const SPACING: NestingSpacingPx = { sideMarginPx: 75, topBottomMarginPx: 150, gutterPx: 150 };

describe("interleaveGroups", () => {
  it("interleaves equal-size groups round-robin", () => {
    const result = interleaveGroups([
      ["a1", "a2"],
      ["b1", "b2"],
      ["c1", "c2"],
    ]);

    assert.deepEqual(result, ["a1", "b1", "c1", "a2", "b2", "c2"]);
  });

  it("skips exhausted groups while continuing to interleave the rest", () => {
    const result = interleaveGroups([
      ["a1", "a2", "a3"],
      ["b1"],
      ["c1", "c2"],
    ]);

    assert.deepEqual(result, ["a1", "b1", "c1", "a2", "c2", "a3"]);
  });

  it("returns a single group unchanged", () => {
    const result = interleaveGroups([["a1", "a2", "a3"]]);
    assert.deepEqual(result, ["a1", "a2", "a3"]);
  });

  it("returns an empty array for empty input", () => {
    assert.deepEqual(interleaveGroups([]), []);
  });

  it("returns an empty array when all groups are empty", () => {
    assert.deepEqual(interleaveGroups([[], []]), []);
  });
});

describe("nestBoxesIntoShelves", () => {
  it("returns no placements for empty input", () => {
    const result = nestBoxesIntoShelves([], 1000, SPACING);
    assert.deepEqual(result.placements, []);
    assert.equal(result.sheetHeightPx, 0);
    assert.deepEqual(result.skipped, []);
  });

  it("centers a single box within the usable width", () => {
    const boxes: NestableBox[] = [{ id: "a", widthPx: 200, heightPx: 100 }];
    const result = nestBoxesIntoShelves(boxes, 1000, SPACING);

    // usableWidthPx = 1000 - 2*75 = 850; leftover = 850 - 200 = 650; half = 325.
    assert.deepEqual(result.placements, [{ id: "a", x: SPACING.sideMarginPx + 325, y: SPACING.topBottomMarginPx, rotated: false }]);
    assert.equal(result.sheetHeightPx, SPACING.topBottomMarginPx + 100 + SPACING.topBottomMarginPx);
    assert.deepEqual(result.skipped, []);
  });

  it("centers a fully-filled row exactly where a left-aligned row would sit", () => {
    const sheetWidthPx = SPACING.sideMarginPx * 2 + 100;
    const boxes: NestableBox[] = [{ id: "a", widthPx: 100, heightPx: 50 }];
    const result = nestBoxesIntoShelves(boxes, sheetWidthPx, SPACING);

    assert.equal(result.placements[0]?.x, SPACING.sideMarginPx);
  });

  it("packs multiple boxes into one row when they fit, tallest first, centered as a group", () => {
    const boxes: NestableBox[] = [
      { id: "short", widthPx: 100, heightPx: 50 },
      { id: "tall", widthPx: 150, heightPx: 150 },
    ];
    const result = nestBoxesIntoShelves(boxes, 1000, SPACING);

    assert.equal(result.placements.length, 2);
    const tall = result.placements.find((p) => p.id === "tall");
    const short = result.placements.find((p) => p.id === "short");
    assert.ok(tall);
    assert.ok(short);
    assert.equal(tall.y, short.y);
    assert.equal(tall.rotated, false);
    assert.equal(short.rotated, false);

    // Row content width = 150 + 150 (gutter) + 100 = 400; usable = 850; leftover = 450; half = 225.
    const expectedRowStartX = SPACING.sideMarginPx + 225;
    assert.equal(tall.x, expectedRowStartX);
    assert.equal(short.x, expectedRowStartX + 150 + SPACING.gutterPx);
    assert.equal(result.sheetHeightPx, SPACING.topBottomMarginPx + 150 + SPACING.topBottomMarginPx);
  });

  it("rotates whichever box drives the row's height, even when sharing the row with others", () => {
    const boxes: NestableBox[] = [
      { id: "tall-narrow", widthPx: 100, heightPx: 400 },
      { id: "small", widthPx: 50, heightPx: 50 },
    ];
    const result = nestBoxesIntoShelves(boxes, 1000, SPACING);

    assert.equal(result.placements.length, 2);
    const tall = result.placements.find((p) => p.id === "tall-narrow");
    const small = result.placements.find((p) => p.id === "small");
    assert.ok(tall);
    assert.ok(small);

    // Rotating tall-narrow (400 tall, the row's driving height) to 400 wide x 100 tall shrinks the
    // row from 400px to 100px, and still fits the sheet's usable width alongside "small".
    assert.equal(tall.rotated, true);
    assert.equal(small.rotated, false);
    assert.equal(result.sheetHeightPx, SPACING.topBottomMarginPx + 100 + SPACING.topBottomMarginPx);
  });

  it("rotates two equally-tall portrait boxes together when both fit rotated", () => {
    const sheetWidthPx = SPACING.sideMarginPx * 2 + 850;
    const boxes: NestableBox[] = [
      { id: "a", widthPx: 100, heightPx: 300 },
      { id: "b", widthPx: 100, heightPx: 300 },
    ];
    const result = nestBoxesIntoShelves(boxes, sheetWidthPx, SPACING);

    // Usable width 850; rotated combined width = 300 + 150 (gutter) + 300 = 750 <= 850, so both fit
    // rotated side by side and both rotate, shrinking the row from 300px to 100px.
    const a = result.placements.find((p) => p.id === "a");
    const b = result.placements.find((p) => p.id === "b");
    assert.equal(a?.rotated, true);
    assert.equal(b?.rotated, true);
    assert.equal(result.sheetHeightPx, SPACING.topBottomMarginPx + 100 + SPACING.topBottomMarginPx);
  });

  it("does not add rotation churn when it cannot reduce the completed row", () => {
    const boxes: NestableBox[] = [
      { id: "a", widthPx: 100, heightPx: 400 },
      { id: "b", widthPx: 100, heightPx: 400 },
    ];
    // Rotating one box still leaves the row 400px tall, so the fewer-rotations tie-break retains
    // the compatibility orientation.
    const result = nestBoxesIntoShelves(boxes, 1000, SPACING);

    const rotatedCount = result.placements.filter((p) => p.rotated).length;
    assert.equal(rotatedCount, 0);
    assert.equal(result.sheetHeightPx, SPACING.topBottomMarginPx + 400 + SPACING.topBottomMarginPx);
  });

  it("does not rotate a portrait box that isn't driving the row's height", () => {
    const boxes: NestableBox[] = [
      { id: "tallest", widthPx: 200, heightPx: 300 },
      { id: "shorter-portrait", widthPx: 50, heightPx: 100 },
    ];
    const result = nestBoxesIntoShelves(boxes, 1000, SPACING);

    const shorterPortrait = result.placements.find((p) => p.id === "shorter-portrait");
    assert.ok(shorterPortrait);
    // shorter-portrait (100 tall) is shorter than the row's driving height (300, from "tallest"),
    // so rotating it would not reduce the row's height at all — no benefit, so it stays as-is.
    assert.equal(shorterPortrait.rotated, false);
  });

  it("overflows to a second row when a box no longer fits the row width", () => {
    const sheetWidthPx = SPACING.sideMarginPx * 2 + 250;
    const boxes: NestableBox[] = [
      { id: "a", widthPx: 200, heightPx: 100 },
      { id: "b", widthPx: 200, heightPx: 80 },
    ];
    const result = nestBoxesIntoShelves(boxes, sheetWidthPx, SPACING);

    const a = result.placements.find((p) => p.id === "a");
    const b = result.placements.find((p) => p.id === "b");
    assert.ok(a);
    assert.ok(b);
    assert.notEqual(a.y, b.y);
    assert.equal(b.y, a.y + 100 + SPACING.gutterPx);
    assert.equal(result.sheetHeightPx, SPACING.topBottomMarginPx + 100 + SPACING.gutterPx + 80 + SPACING.topBottomMarginPx);
  });

  it("skips a box wider than the sheet's usable width while still nesting the rest", () => {
    const sheetWidthPx = SPACING.sideMarginPx * 2 + 100;
    const boxes: NestableBox[] = [
      { id: "oversize", widthPx: 500, heightPx: 200 },
      { id: "fits", widthPx: 80, heightPx: 60 },
    ];
    const result = nestBoxesIntoShelves(boxes, sheetWidthPx, SPACING);

    assert.deepEqual(result.skipped, [{ id: "oversize", reason: "too_wide_for_sheet" }]);
    assert.equal(result.placements.length, 1);
    assert.equal(result.placements[0]?.id, "fits");
  });

  it("rotates a lone box that is taller than it is wide", () => {
    const sheetWidthPx = 1000;
    const boxes: NestableBox[] = [{ id: "tall-narrow", widthPx: 100, heightPx: 400 }];
    const result = nestBoxesIntoShelves(boxes, sheetWidthPx, SPACING);

    assert.equal(result.placements.length, 1);
    const placement = result.placements[0];
    assert.equal(placement?.rotated, true);

    // After rotation the effective box is 400 wide x 100 tall, so row height is 100, not 400.
    assert.equal(result.sheetHeightPx, SPACING.topBottomMarginPx + 100 + SPACING.topBottomMarginPx);

    // Centered using the rotated (swapped) width: usable = 1000 - 150 = 850; leftover = 450; half = 225.
    assert.equal(placement?.x, SPACING.sideMarginPx + 225);
  });

  it("does not rotate a lone box that is wider than it is tall", () => {
    const boxes: NestableBox[] = [{ id: "wide", widthPx: 400, heightPx: 100 }];
    const result = nestBoxesIntoShelves(boxes, 1000, SPACING);

    assert.equal(result.placements[0]?.rotated, false);
    assert.equal(result.sheetHeightPx, SPACING.topBottomMarginPx + 100 + SPACING.topBottomMarginPx);
  });

  it("does not rotate a square lone box", () => {
    const boxes: NestableBox[] = [{ id: "square", widthPx: 100, heightPx: 100 }];
    const result = nestBoxesIntoShelves(boxes, 1000, SPACING);

    assert.equal(result.placements[0]?.rotated, false);
  });
});

describe("nestBoxesIntoShelvesWithHeightCap", () => {
  it("keeps everything on one sheet when under the height cap", () => {
    const boxes: NestableBox[] = [
      { id: "a", widthPx: 200, heightPx: 100 },
      { id: "b", widthPx: 200, heightPx: 100 },
    ];
    const result = nestBoxesIntoShelvesWithHeightCap(boxes, 1000, SPACING, 10000);

    assert.equal(result.sheets.length, 1);
    assert.equal(result.sheets[0]?.placements.length, 2);
    assert.deepEqual(result.skipped, []);
  });

  it("splits into a new sheet once the height cap would be exceeded", () => {
    const sheetWidthPx = SPACING.sideMarginPx * 2 + 100;
    const rowHeightPx = 100;
    const maxSheetHeightPx = SPACING.topBottomMarginPx * 2 + rowHeightPx;
    const boxes: NestableBox[] = [
      { id: "row1", widthPx: 80, heightPx: rowHeightPx },
      { id: "row2", widthPx: 80, heightPx: rowHeightPx },
    ];

    const result = nestBoxesIntoShelvesWithHeightCap(boxes, sheetWidthPx, SPACING, maxSheetHeightPx);

    assert.equal(result.sheets.length, 2);
    assert.equal(result.sheets[0]?.placements[0]?.id, "row1");
    assert.equal(result.sheets[1]?.placements[0]?.id, "row2");
    assert.deepEqual(result.skipped, []);
  });

  it("keeps a box on the current sheet when rotating it would avoid exceeding the height cap", () => {
    // Usable width 300. Row 1: a 250-wide, 100-tall box fills most of the row. The next box
    // (100 wide x 250 tall, portrait) can't share row 1 (250 + 150 gutter + 100 > 300), so it
    // would start a new row. Unrotated (250 tall) that new row would push the sheet past the
    // height cap; rotated (100 wide x 250 tall -> 250 wide x 100 tall) it fits comfortably, and
    // its rotated width (250) fits the row alone. The height-cap peek should recognize this and
    // keep both boxes on one sheet instead of splitting.
    const sheetWidthPx = SPACING.sideMarginPx * 2 + 300;
    const boxes: NestableBox[] = [
      { id: "row1", widthPx: 250, heightPx: 100 },
      { id: "rotates-to-fit", widthPx: 100, heightPx: 250 },
    ];
    // Cap only has room for two 100px-tall rows, not one 100px row plus one 250px-tall row.
    const maxSheetHeightPx = SPACING.topBottomMarginPx * 2 + 100 + SPACING.gutterPx + 100;

    const result = nestBoxesIntoShelvesWithHeightCap(boxes, sheetWidthPx, SPACING, maxSheetHeightPx);

    assert.equal(result.sheets.length, 1);
    assert.equal(result.sheets[0]?.placements.length, 2);
    const rotatesToFit = result.sheets[0]?.placements.find((p) => p.id === "rotates-to-fit");
    assert.equal(rotatesToFit?.rotated, true);
  });

  it("still skips oversize boxes while splitting the rest across sheets", () => {
    const sheetWidthPx = SPACING.sideMarginPx * 2 + 100;
    const boxes: NestableBox[] = [
      { id: "oversize", widthPx: 500, heightPx: 200 },
      { id: "fits", widthPx: 80, heightPx: 60 },
    ];
    const result = nestBoxesIntoShelvesWithHeightCap(boxes, sheetWidthPx, SPACING, 10000);

    assert.deepEqual(result.skipped, [{ id: "oversize", reason: "too_wide_for_sheet" }]);
    assert.equal(result.sheets.length, 1);
    assert.equal(result.sheets[0]?.placements[0]?.id, "fits");
  });

  it("returns no sheets for empty input", () => {
    const result = nestBoxesIntoShelvesWithHeightCap([], 1000, SPACING, 10000);
    assert.deepEqual(result.sheets, []);
    assert.deepEqual(result.skipped, []);
  });

  it("rotates a lone tall box even when splitting across sheets", () => {
    // The boxes cannot share a row, but each lone portrait box can rotate within the 500px usable
    // width. The finalized row height is therefore used for the cap decision and placement.
    const sheetWidthPx = SPACING.sideMarginPx * 2 + 500;
    const boxes: NestableBox[] = [
      { id: "tall-narrow-1", widthPx: 300, heightPx: 400 },
      { id: "tall-narrow-2", widthPx: 300, heightPx: 400 },
    ];
    const maxSheetHeightPx = SPACING.topBottomMarginPx * 2 + 400;

    const result = nestBoxesIntoShelvesWithHeightCap(boxes, sheetWidthPx, SPACING, maxSheetHeightPx);

    assert.equal(result.sheets.length, 2);
    for (const sheet of result.sheets) {
      assert.equal(sheet.placements.length, 1);
      assert.equal(sheet.placements[0]?.rotated, true);
    }
  });
});

describe("standard gang sheet two-up at 300 DPI", () => {
  const EXPORT_DPI = 300;
  const sideMarginInches = 0.25;
  const gutterInches = 0.5;
  const sheetWidthInches = 23;
  const spacing = {
    sideMarginPx: Math.round(sideMarginInches * EXPORT_DPI),
    topBottomMarginPx: Math.round(0.5 * EXPORT_DPI),
    gutterPx: Math.round(gutterInches * EXPORT_DPI),
  };
  const sheetWidthPx = Math.round(sheetWidthInches * EXPORT_DPI);

  it("fits two 11 inch prints side by side on the standard 23 inch sheet", () => {
    const elevenInchesPx = Math.round(11 * EXPORT_DPI);
    const boxes: NestableBox[] = [
      { id: "a", widthPx: elevenInchesPx, heightPx: 1200 },
      { id: "b", widthPx: elevenInchesPx, heightPx: 1200 },
    ];
    const result = nestBoxesIntoShelves(boxes, sheetWidthPx, spacing);

    assert.equal(result.skipped.length, 0);
    assert.equal(result.placements.length, 2);
    assert.equal(result.placements[0]?.y, result.placements[1]?.y);
  });

  it("does not place two 12 inch prints in the same row on the standard sheet", () => {
    const twelveInchesPx = Math.round(12 * EXPORT_DPI);
    const boxes: NestableBox[] = [
      { id: "a", widthPx: twelveInchesPx, heightPx: 1200 },
      { id: "b", widthPx: twelveInchesPx, heightPx: 1200 },
    ];
    const result = nestBoxesIntoShelves(boxes, sheetWidthPx, spacing);

    assert.equal(result.skipped.length, 0);
    assert.equal(result.placements.length, 2);
    assert.notEqual(result.placements[0]?.y, result.placements[1]?.y);
  });
});

describe("orientation-aware shelf-packing regressions", () => {
  it("reduces the exact 300 DPI A/B fixture while preserving all copies and shelf bounds", () => {
    const spacing: NestingSpacingPx = {
      sideMarginPx: 75,
      topBottomMarginPx: 150,
      gutterPx: 150,
    };
    const aBoxes = Array.from({ length: 10 }, (_, index) => ({
      id: `A-${index + 1}`,
      widthPx: 3900,
      heightPx: 2805,
    }));
    const bBoxes = Array.from({ length: 5 }, (_, index) => ({
      id: `B-${index + 1}`,
      widthPx: 3600,
      heightPx: 2427,
    }));
    const boxes = interleaveGroups([aBoxes, bBoxes]);
    const dimensions = new Map(boxes.map((box) => [box.id, box]));
    const first = nestBoxesIntoShelvesWithHeightCap(boxes, 6900, spacing, 90000);
    const second = nestBoxesIntoShelvesWithHeightCap(boxes, 6900, spacing, 90000);

    assert.deepEqual(first, second);
    assert.equal(first.skipped.length, 0);
    assert.equal(first.sheets.length, 1);
    assert.equal(first.sheets[0]?.placements.length, 15);
    assert.equal(first.sheets[0]?.sheetHeightPx, 30477);
    assert.equal(new Set(first.sheets[0]?.placements.map((placement) => placement.id)).size, 15);

    const rows = new Map<number, typeof first.sheets[number]["placements"]>();
    for (const placement of first.sheets[0]?.placements ?? []) {
      const row = rows.get(placement.y) ?? [];
      row.push(placement);
      rows.set(placement.y, row);
    }
    assert.ok([...rows.values()].some((row) => row.length >= 2 && row.every((placement) => placement.rotated)));

    const orderedRows = [...rows.entries()].sort(([left], [right]) => left - right);
    let previousBottom = spacing.topBottomMarginPx;
    for (const [rowY, row] of orderedRows) {
      assert.ok(rowY >= previousBottom);
      let previousRight = spacing.sideMarginPx;
      let rowBottom = rowY;
      for (const placement of [...row].sort((left, right) => left.x - right.x)) {
        const source = dimensions.get(placement.id);
        assert.ok(source);
        const widthPx = placement.rotated ? source!.heightPx : source!.widthPx;
        const heightPx = placement.rotated ? source!.widthPx : source!.heightPx;
        assert.ok(placement.x >= spacing.sideMarginPx);
        assert.ok(placement.x + widthPx <= 6900 - spacing.sideMarginPx);
        assert.ok(placement.x >= previousRight);
        previousRight = placement.x + widthPx + spacing.gutterPx;
        rowBottom = Math.max(rowBottom, rowY + heightPx);
      }
      previousBottom = rowBottom + spacing.gutterPx;
    }
  });

  it("keeps a landscape rotation when it materially reduces two-row feed height", () => {
    const result = nestBoxesIntoShelves(
      [
        { id: "a", widthPx: 600, heightPx: 400 },
        { id: "b", widthPx: 600, heightPx: 400 },
      ],
      950,
      { sideMarginPx: 0, topBottomMarginPx: 0, gutterPx: 150 },
    );

    assert.equal(result.placements.length, 2);
    assert.equal(result.placements[0]?.y, result.placements[1]?.y);
    assert.equal(result.placements[0]?.rotated, true);
    assert.equal(result.placements[1]?.rotated, true);
    assert.equal(result.sheetHeightPx, 600);
  });

  it("rejects a landscape rotation when the taller shared row would be worse", () => {
    const result = nestBoxesIntoShelves(
      [
        { id: "a", widthPx: 750, heightPx: 500 },
        { id: "b", widthPx: 100, heightPx: 80 },
      ],
      850,
      { sideMarginPx: 0, topBottomMarginPx: 0, gutterPx: 150 },
    );

    assert.equal(result.placements.length, 2);
    assert.notEqual(result.placements[0]?.y, result.placements[1]?.y);
    assert.equal(result.placements.find((placement) => placement.id === "a")?.rotated, false);
    assert.equal(result.sheetHeightPx, 730);
  });

  it("can rotate a non-height-driving item when it enables a future row member", () => {
    const result = nestBoxesIntoShelves(
      [
        { id: "b", widthPx: 300, heightPx: 500 },
        { id: "a", widthPx: 500, heightPx: 400 },
        { id: "c", widthPx: 100, heightPx: 350 },
      ],
      1000,
      { sideMarginPx: 0, topBottomMarginPx: 0, gutterPx: 100 },
    );

    assert.equal(new Set(result.placements.map((placement) => placement.y)).size, 1);
    assert.equal(result.placements.find((placement) => placement.id === "a")?.rotated, true);
    assert.equal(result.sheetHeightPx, 500);
  });

  it("retains original orientation on an exact feed-height tie", () => {
    const result = nestBoxesIntoShelves(
      [
        { id: "a", widthPx: 700, heightPx: 500 },
        { id: "b", widthPx: 300, heightPx: 100 },
      ],
      1000,
      { sideMarginPx: 0, topBottomMarginPx: 0, gutterPx: 100 },
    );

    assert.equal(result.sheetHeightPx, 700);
    assert.equal(result.placements.find((placement) => placement.id === "a")?.rotated, false);
    assert.notEqual(result.placements[0]?.y, result.placements[1]?.y);
  });

  it("places a box whose original width is too large when only its rotation fits, and skips a box with neither fit", () => {
    const result = nestBoxesIntoShelves(
      [
        { id: "rotated-fit", widthPx: 400, heightPx: 250 },
        { id: "too-wide", widthPx: 400, heightPx: 350 },
      ],
      300,
      { sideMarginPx: 0, topBottomMarginPx: 0, gutterPx: 50 },
    );

    assert.deepEqual(result.skipped, [{ id: "too-wide", reason: "too_wide_for_sheet" }]);
    assert.equal(result.placements.length, 1);
    assert.equal(result.placements[0]?.id, "rotated-fit");
    assert.equal(result.placements[0]?.rotated, true);
  });

  it("uses finalized orientation for the height-cap join boundary", () => {
    const spacing = { sideMarginPx: 0, topBottomMarginPx: 0, gutterPx: 100 };
    const boxes = [
      { id: "a", widthPx: 700, heightPx: 500 },
      { id: "b", widthPx: 300, heightPx: 600 },
    ];
    const fits = nestBoxesIntoShelvesWithHeightCap(boxes, 1000, spacing, 700);
    const splits = nestBoxesIntoShelvesWithHeightCap(boxes, 1000, spacing, 699);

    assert.equal(fits.sheets.length, 1);
    assert.equal(fits.sheets[0]?.sheetHeightPx, 700);
    assert.equal(fits.sheets[0]?.placements.find((placement) => placement.id === "a")?.rotated, true);
    assert.equal(splits.sheets.length, 2);
    assert.ok(splits.sheets.every((sheet) => sheet.sheetHeightPx <= 699));
  });
});
