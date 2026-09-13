import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ARTWORK_BACKGROUND_PRESET_GREY,
  ARTWORK_BACKGROUND_PRESET_LIGHT_BLACK,
} from "../constants/design/artworkBackground.constants";
import {
  computeOpaquePixelLumaStatsFromRgba,
  shouldPreferDarkArtworkMatFromPixelStats,
} from "./importArtworkBackgroundDetection";
import {
  buildImportDesignBackgroundAndHalftoneFields,
  resolveImportArtworkBackgroundDecision,
  resolveImportAutoResolvedMatLabel,
  resolveImportPreviewBackgroundCssHex,
} from "./resolveImportArtworkBackgroundDecision";

function fillOpaqueRect(
  data: Uint8Array,
  width: number,
  channels: number,
  x0: number,
  y0: number,
  w: number,
  h: number,
  rgb: [number, number, number],
): void {
  for (let y = y0; y < y0 + h; y += 1) {
    for (let x = x0; x < x0 + w; x += 1) {
      const i = (y * width + x) * channels;
      data[i] = rgb[0];
      data[i + 1] = rgb[1];
      data[i + 2] = rgb[2];
      if (channels >= 4) data[i + 3] = 255;
    }
  }
}

/** Sparse horizontal strokes — low bbox occupancy (cream secondary path). */
function strokeSparseHLines(
  data: Uint8Array,
  width: number,
  channels: number,
  x0: number,
  y0: number,
  w: number,
  h: number,
  rgb: [number, number, number],
  step = 5,
): void {
  for (let y = y0; y < y0 + h; y += step) {
    fillOpaqueRect(data, width, channels, x0, y, w, 1, rgb);
  }
}

function makeRgbaCanvas(
  width: number,
  height: number,
  paint: (data: Uint8Array) => void,
): { data: Uint8Array; width: number; height: number; channels: 4 } {
  const channels = 4 as const;
  const data = new Uint8Array(width * height * channels);
  paint(data);
  return { data, width, height, channels };
}

function prefersDark(canvas: {
  data: Uint8Array;
  width: number;
  height: number;
  channels: 4;
}): boolean {
  return shouldPreferDarkArtworkMatFromPixelStats(
    computeOpaquePixelLumaStatsFromRgba(canvas),
  );
}

describe("resolveImportArtworkBackgroundDecision precedence", () => {
  it("0. per-image dark wins over session light and auto", () => {
    assert.deepEqual(
      resolveImportArtworkBackgroundDecision({
        backgroundMode: "all_light",
        halftoneMode: "all_halftones",
        autoSuggestsDark: false,
        itemBackgroundOverride: "dark",
      }),
      { hex: ARTWORK_BACKGROUND_PRESET_LIGHT_BLACK, source: "import_override" },
    );
  });

  it("0. per-image light wins over session dark and detector", () => {
    assert.deepEqual(
      resolveImportArtworkBackgroundDecision({
        backgroundMode: "all_dark",
        halftoneMode: "normal",
        autoSuggestsDark: true,
        itemBackgroundOverride: "light",
      }),
      { hex: null, source: "import_override" },
    );
  });

  it("0. per-image auto falls through session all_dark", () => {
    assert.deepEqual(
      resolveImportArtworkBackgroundDecision({
        backgroundMode: "all_dark",
        halftoneMode: "normal",
        autoSuggestsDark: false,
        itemBackgroundOverride: "auto",
      }),
      { hex: ARTWORK_BACKGROUND_PRESET_LIGHT_BLACK, source: "import_override" },
    );
  });

  it("1. all_dark override wins over halftone and auto", () => {
    assert.deepEqual(
      resolveImportArtworkBackgroundDecision({
        backgroundMode: "all_dark",
        halftoneMode: "all_halftones",
        autoSuggestsDark: true,
      }),
      { hex: ARTWORK_BACKGROUND_PRESET_LIGHT_BLACK, source: "import_override" },
    );
  });

  it("1. all_light override wins (omit hex) even when auto/halftone would darken", () => {
    assert.deepEqual(
      resolveImportArtworkBackgroundDecision({
        backgroundMode: "all_light",
        halftoneMode: "all_halftones",
        autoSuggestsDark: true,
      }),
      { hex: null, source: "import_override" },
    );
  });

  it("2. all_halftones with auto → dark via import_halftone_default", () => {
    assert.deepEqual(
      resolveImportArtworkBackgroundDecision({
        backgroundMode: "auto",
        halftoneMode: "all_halftones",
        autoSuggestsDark: false,
      }),
      { hex: ARTWORK_BACKGROUND_PRESET_LIGHT_BLACK, source: "import_halftone_default" },
    );
  });

  it("3. auto detector dark → code_auto", () => {
    assert.deepEqual(
      resolveImportArtworkBackgroundDecision({
        backgroundMode: "auto",
        halftoneMode: "normal",
        autoSuggestsDark: true,
      }),
      { hex: ARTWORK_BACKGROUND_PRESET_LIGHT_BLACK, source: "code_auto" },
    );
  });

  it("4. auto + normal + no suggest → default light omit", () => {
    assert.deepEqual(
      resolveImportArtworkBackgroundDecision({
        backgroundMode: "auto",
        halftoneMode: "normal",
        autoSuggestsDark: false,
      }),
      { hex: null, source: null },
    );
  });
});

describe("import preview CSS + Auto label", () => {
  it("preview uses dark CSS when detector suggests dark under Auto", () => {
    assert.equal(
      resolveImportPreviewBackgroundCssHex({
        backgroundMode: "auto",
        halftoneMode: "normal",
        autoSuggestsDark: true,
      }),
      ARTWORK_BACKGROUND_PRESET_LIGHT_BLACK,
    );
    assert.equal(
      resolveImportAutoResolvedMatLabel({
        backgroundMode: "auto",
        halftoneMode: "normal",
        autoSuggestsDark: true,
      }),
      "Dark",
    );
  });

  it("preview uses light grey CSS when Auto resolves light", () => {
    assert.equal(
      resolveImportPreviewBackgroundCssHex({
        backgroundMode: "auto",
        halftoneMode: "normal",
        autoSuggestsDark: false,
      }),
      ARTWORK_BACKGROUND_PRESET_GREY,
    );
  });
});

describe("buildImportDesignBackgroundAndHalftoneFields", () => {
  it("all_halftones sets staff decision with import_batch provenance", () => {
    const fields = buildImportDesignBackgroundAndHalftoneFields({
      backgroundMode: "auto",
      halftoneMode: "all_halftones",
      autoSuggestsDark: false,
      callerId: "staff-1",
    });

    assert.equal(fields.artworkBackgroundHex, ARTWORK_BACKGROUND_PRESET_LIGHT_BLACK);
    assert.equal(fields.artworkBackgroundSource, "import_halftone_default");
    assert.deepEqual(fields.halftoneStaffDecision, {
      value: true,
      decidedBy: "staff-1",
      isExplicitOverride: true,
    });
    assert.equal(fields.halftoneDecisionSource, "import_batch");
  });

  it("all_dark alone does not set halftone", () => {
    const fields = buildImportDesignBackgroundAndHalftoneFields({
      backgroundMode: "all_dark",
      halftoneMode: "normal",
      autoSuggestsDark: true,
      callerId: "staff-1",
    });

    assert.equal(fields.artworkBackgroundHex, ARTWORK_BACKGROUND_PRESET_LIGHT_BLACK);
    assert.equal(fields.artworkBackgroundSource, "import_override");
    assert.equal(fields.halftoneStaffDecision, undefined);
    assert.equal(fields.halftoneDecisionSource, undefined);
  });

  it("per-image light override does not set halftone under all_halftones session still sets halftone", () => {
    const fields = buildImportDesignBackgroundAndHalftoneFields({
      backgroundMode: "auto",
      halftoneMode: "all_halftones",
      autoSuggestsDark: true,
      itemBackgroundOverride: "light",
      callerId: "staff-1",
    });
    assert.equal(fields.artworkBackgroundHex, undefined);
    assert.equal(fields.artworkBackgroundSource, "import_override");
    assert.ok(fields.halftoneStaffDecision);
  });

  it("per-image halftone off overrides session all_halftones", () => {
    const fields = buildImportDesignBackgroundAndHalftoneFields({
      backgroundMode: "auto",
      halftoneMode: "all_halftones",
      autoSuggestsDark: false,
      itemHalftoneOverride: "off",
      callerId: "staff-1",
    });

    assert.equal(fields.halftoneStaffDecision, undefined);
    assert.equal(fields.artworkBackgroundHex, undefined);
  });

  it("per-image halftone on under normal session sets staff decision", () => {
    const fields = buildImportDesignBackgroundAndHalftoneFields({
      backgroundMode: "auto",
      halftoneMode: "normal",
      autoSuggestsDark: false,
      itemHalftoneOverride: "on",
      callerId: "staff-1",
    });

    assert.ok(fields.halftoneStaffDecision?.value);
    assert.equal(fields.artworkBackgroundHex, ARTWORK_BACKGROUND_PRESET_LIGHT_BLACK);
    assert.equal(fields.artworkBackgroundSource, "import_halftone_default");
  });
});

describe("luma detector fixtures (C2b pre-poodle + cream sparse)", () => {
  it("primary: solid near-white art → Dark", () => {
    const canvas = makeRgbaCanvas(80, 80, (data) => {
      fillOpaqueRect(data, 80, 4, 10, 10, 60, 60, [250, 250, 250]);
    });
    assert.equal(prefersDark(canvas), true);
  });

  it("secondary: sparse cream line art (poodle-like) → Dark", () => {
    const canvas = makeRgbaCanvas(80, 80, (data) => {
      strokeSparseHLines(data, 80, 4, 10, 10, 55, 55, [224, 208, 192], 6);
    });
    const stats = computeOpaquePixelLumaStatsFromRgba(canvas);
    assert.ok(stats.meanLuma < 0.88, `meanLuma=${stats.meanLuma}`);
    assert.ok(stats.bboxOccupancy <= 0.28, `occupancy=${stats.bboxOccupancy}`);
    assert.equal(prefersDark(canvas), true);
  });

  it("secondary: sparse white line art → Dark", () => {
    const canvas = makeRgbaCanvas(80, 80, (data) => {
      strokeSparseHLines(data, 80, 4, 12, 12, 50, 50, [250, 250, 250], 7);
    });
    assert.equal(prefersDark(canvas), true);
  });

  it("white typography with strong black outline → Light", () => {
    const canvas = makeRgbaCanvas(80, 80, (data) => {
      fillOpaqueRect(data, 80, 4, 15, 25, 50, 28, [0, 0, 0]);
      fillOpaqueRect(data, 80, 4, 18, 28, 44, 22, [255, 255, 255]);
    });
    assert.equal(prefersDark(canvas), false);
  });

  it("Daddy-like white-dominant lettering (minor blue/black) → Dark via primary", () => {
    const canvas = makeRgbaCanvas(100, 100, (data) => {
      // Large white letter blocks (dominant ≥90% of opaque)
      fillOpaqueRect(data, 100, 4, 5, 5, 90, 32, [255, 255, 255]);
      fillOpaqueRect(data, 100, 4, 5, 48, 70, 42, [255, 255, 255]);
      // Thin blue bars + tiny shield accent
      fillOpaqueRect(data, 100, 4, 5, 39, 90, 2, [30, 90, 180]);
      fillOpaqueRect(data, 100, 4, 5, 42, 90, 2, [30, 90, 180]);
      fillOpaqueRect(data, 100, 4, 82, 55, 10, 12, [20, 20, 20]);
    });
    const stats = computeOpaquePixelLumaStatsFromRgba(canvas);
    assert.ok(stats.lightOpaqueRatio >= 0.9, `lightRatio=${stats.lightOpaqueRatio}`);
    assert.ok(stats.meanLuma >= 0.88, `meanLuma=${stats.meanLuma}`);
    assert.equal(prefersDark(canvas), true);
  });

  it("99-problems-like red/black mixed typography → Light", () => {
    const canvas = makeRgbaCanvas(80, 80, (data) => {
      fillOpaqueRect(data, 80, 4, 8, 10, 30, 28, [200, 30, 40]);
      fillOpaqueRect(data, 80, 4, 42, 18, 30, 14, [15, 15, 15]);
      fillOpaqueRect(data, 80, 4, 8, 45, 40, 28, [20, 20, 20]);
      fillOpaqueRect(data, 80, 4, 52, 52, 22, 12, [15, 15, 15]);
    });
    assert.equal(prefersDark(canvas), false);
  });

  it("cream + dark illustrated goose → Light", () => {
    const canvas = makeRgbaCanvas(80, 80, (data) => {
      strokeSparseHLines(data, 80, 4, 8, 8, 64, 24, [230, 220, 200], 4);
      fillOpaqueRect(data, 80, 4, 20, 40, 40, 30, [40, 35, 30]);
    });
    assert.equal(prefersDark(canvas), false);
  });

  it("dark/colorful illustration → Light", () => {
    const canvas = makeRgbaCanvas(80, 80, (data) => {
      fillOpaqueRect(data, 80, 4, 10, 10, 60, 60, [180, 20, 30]);
      fillOpaqueRect(data, 80, 4, 25, 25, 30, 30, [20, 20, 20]);
    });
    assert.equal(prefersDark(canvas), false);
  });

  it("dense cream fill (not sparse) → Light via secondary occupancy fail; below primary mean", () => {
    const canvas = makeRgbaCanvas(80, 80, (data) => {
      fillOpaqueRect(data, 80, 4, 10, 10, 60, 60, [224, 208, 192]);
    });
    const stats = computeOpaquePixelLumaStatsFromRgba(canvas);
    assert.equal(stats.bboxOccupancy, 1);
    assert.ok(stats.meanLuma < 0.88);
    assert.equal(prefersDark(canvas), false);
  });

  it("cannabis mixed green/gold/dark → Light", () => {
    const canvas = makeRgbaCanvas(80, 80, (data) => {
      fillOpaqueRect(data, 80, 4, 15, 15, 50, 50, [40, 120, 50]);
      fillOpaqueRect(data, 80, 4, 25, 25, 30, 20, [200, 170, 40]);
    });
    assert.equal(prefersDark(canvas), false);
  });

  it("bright pink typography → Light", () => {
    const canvas = makeRgbaCanvas(80, 80, (data) => {
      fillOpaqueRect(data, 80, 4, 10, 25, 60, 30, [255, 80, 180]);
    });
    assert.equal(prefersDark(canvas), false);
  });

  it("near-empty transparent → Light", () => {
    const canvas = makeRgbaCanvas(80, 80, (data) => {
      fillOpaqueRect(data, 80, 4, 0, 0, 2, 2, [255, 255, 255]);
    });
    assert.equal(prefersDark(canvas), false);
  });

  it("dark solid artwork → Light", () => {
    const canvas = makeRgbaCanvas(40, 40, (data) => {
      fillOpaqueRect(data, 40, 4, 5, 5, 30, 30, [20, 20, 20]);
    });
    assert.equal(prefersDark(canvas), false);
  });

  it("white stipple on opaque black field → Light (no light-ink fallback)", () => {
    const canvas = makeRgbaCanvas(80, 80, (data) => {
      fillOpaqueRect(data, 80, 4, 0, 0, 80, 80, [0, 0, 0]);
      for (let y = 10; y < 70; y += 3) {
        for (let x = 10; x < 70; x += 3) {
          const i = (y * 80 + x) * 4;
          data[i] = 255;
          data[i + 1] = 255;
          data[i + 2] = 255;
        }
      }
    });
    assert.equal(prefersDark(canvas), false);
  });

  it("ignores transparent pixels", () => {
    const canvas = makeRgbaCanvas(20, 20, () => {
      /* all transparent */
    });
    const stats = computeOpaquePixelLumaStatsFromRgba(canvas);
    assert.equal(stats.opaquePixelCount, 0);
    assert.equal(shouldPreferDarkArtworkMatFromPixelStats(stats), false);
  });

  it("sparse/transparent stats stay conservative", () => {
    assert.equal(
      shouldPreferDarkArtworkMatFromPixelStats({
        opaquePixelCount: 20,
        sparseRatio: 0.002,
        lightOpaqueRatio: 0.99,
        meanLuma: 0.95,
        creamOpaqueRatio: 0.99,
        bboxOccupancy: 0.1,
      }),
      false,
    );
  });
});
