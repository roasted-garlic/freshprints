import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_STANDARD_PRINT_SIZES_SETTINGS,
  RETIRED_STANDARD_PRINT_SIZE_PRESET_KEY_SUFFIXES,
  STANDARD_PRINT_SIZE_PLACEMENT_ORDER,
  buildDefaultStandardPrintSizesSettings,
  findStandardPrintSizePreset,
  formatStandardPrintSizeSelectionLabel,
  getDefaultStandardPrintSizeGroupId,
  parseStandardPrintSizesSettingsInput,
  printInchesMatchAtPresetPrecision,
  resolveStandardPrintSizesSettings,
  resolveStandardSizePresetKeyAfterManualSizeChange,
  shouldShowStandardPrintSizeGroupSubTabs,
} from "./standardPrintSizesSettings.constants";
import { applyStandardPrintSizePreset } from "../../utils/applyStandardPrintSizePreset";

function collectPresetKeys(settings = DEFAULT_STANDARD_PRINT_SIZES_SETTINGS): string[] {
  return settings.placements.flatMap((placement) =>
    placement.groups.flatMap((group) => group.presets.map((preset) => preset.key)),
  );
}

function findPreset(key: string) {
  return findStandardPrintSizePreset(DEFAULT_STANDARD_PRINT_SIZES_SETTINGS, key);
}

test("v1 defaults include all seven placement tabs in canonical order", () => {
  assert.deepEqual(
    DEFAULT_STANDARD_PRINT_SIZES_SETTINGS.placements.map((placement) => placement.id),
    [...STANDARD_PRINT_SIZE_PLACEMENT_ORDER],
  );
  assert.equal(STANDARD_PRINT_SIZE_PLACEMENT_ORDER.length, 7);
  assert.ok(DEFAULT_STANDARD_PRINT_SIZES_SETTINGS.placements.some((p) => p.id === "pocket"));
});

test("Full Front Adult includes XS through 5XL with approved widths", () => {
  assert.equal(findPreset("full_front.adult.xs")?.widthInches, 9.5);
  assert.equal(findPreset("full_front.adult.2xl")?.widthInches, 13);
  assert.equal(findPreset("full_front.adult.3xl")?.widthInches, 14);
  assert.equal(findPreset("full_front.adult.4xl")?.widthInches, 16);
  assert.equal(findPreset("full_front.adult.5xl")?.widthInches, 17);
});

test("Full Back Adult includes 3XL 14.5 and 5XL 17", () => {
  assert.equal(findPreset("full_back.adult.3xl")?.widthInches, 14.5);
  assert.equal(findPreset("full_back.adult.4xl")?.widthInches, 16);
  assert.equal(findPreset("full_back.adult.5xl")?.widthInches, 17);
});

test("Youth Y2XL and infant month ranges exist on Full Front", () => {
  assert.equal(findPreset("full_front.youth.y2xl")?.widthInches, 11);
  assert.equal(findPreset("full_front.infant.0_3m")?.widthInches, 4);
  assert.equal(findPreset("full_front.infant.18_24m")?.widthInches, 6);
});

test("Toddler 2T through 6T exist on Full Front", () => {
  assert.equal(findPreset("full_front.toddler.2t")?.widthInches, 5.5);
  assert.equal(findPreset("full_front.toddler.6t")?.widthInches, 7.5);
});

test("Hat front and side panel defaults match v1 table", () => {
  assert.equal(findPreset("hat.front_panel.small")?.widthInches, 3.5);
  assert.equal(findPreset("hat.front_panel.standard")?.widthInches, 4);
  assert.equal(findPreset("hat.front_panel.large")?.widthInches, 4.5);
  assert.equal(findPreset("hat.front_panel.max")?.widthInches, 5);
  assert.equal(findPreset("hat.side_panel.small")?.widthInches, 2);
  assert.equal(findPreset("hat.side_panel.standard")?.widthInches, 2.5);
  assert.equal(findPreset("hat.side_panel.large")?.widthInches, 3);
});

test("Pocket presets exist with approved widths", () => {
  const pocket = DEFAULT_STANDARD_PRINT_SIZES_SETTINGS.placements.find((p) => p.id === "pocket");
  assert.ok(pocket);
  assert.deepEqual(
    pocket.groups.map((group) => group.id),
    ["pocket"],
  );
  assert.equal(findPreset("pocket.pocket.small")?.widthInches, 2.5);
  assert.equal(findPreset("pocket.pocket.medium")?.widthInches, 3);
  assert.equal(findPreset("pocket.pocket.large")?.widthInches, 3.5);
});

test("retired provisional grouped keys are excluded from canonical defaults", () => {
  const keys = collectPresetKeys();
  assert.ok(!keys.some((key) => key.endsWith(".xxl_plus")));
  assert.ok(!keys.some((key) => key.includes(".m_l")));
  assert.ok(!keys.some((key) => key.includes(".xs_s")));
  for (const suffix of RETIRED_STANDARD_PRINT_SIZE_PRESET_KEY_SUFFIXES) {
    assert.ok(!keys.some((key) => key.endsWith(`.${suffix}`)));
  }
});

test("resolve overlays saved widths by stable key and exposes new v1 presets", () => {
  const resolved = resolveStandardPrintSizesSettings({
    placements: [
      {
        id: "full_front",
        groups: [
          {
            id: "adult",
            presets: [{ key: "full_front.adult.m_l", widthInches: 11.5, enabled: true }],
          },
        ],
      },
    ],
  });

  assert.equal(findStandardPrintSizePreset(resolved, "full_front.adult.m_l"), undefined);
  assert.equal(findStandardPrintSizePreset(resolved, "full_front.adult.m")?.widthInches, 11);
  assert.equal(findStandardPrintSizePreset(resolved, "full_front.adult.3xl")?.widthInches, 14);
  assert.ok(findStandardPrintSizePreset(resolved, "pocket.pocket.small"));
});

test("resolve preserves matching saved width without rewriting unrelated presets", () => {
  const resolved = resolveStandardPrintSizesSettings({
    placements: [
      {
        id: "full_front",
        groups: [
          {
            id: "adult",
            presets: [{ key: "full_front.adult.m", widthInches: 10.75, enabled: true }],
          },
        ],
      },
    ],
  });
  const saved = findStandardPrintSizePreset(resolved, "full_front.adult.m");
  assert.equal(saved?.widthInches, 10.75);
  assert.equal(saved?.enabled, true);
  assert.equal(findStandardPrintSizePreset(resolved, "full_front.adult.l")?.widthInches, 11.5);
});

test("reset to defaults produces exactly the canonical v1 table", () => {
  const reset = buildDefaultStandardPrintSizesSettings();
  assert.deepEqual(reset, DEFAULT_STANDARD_PRINT_SIZES_SETTINGS);
});

test("parse rejects structural changes against v1 catalog", () => {
  const invalid = parseStandardPrintSizesSettingsInput({
    placements: [{ id: "full_front", groups: [], enabled: true, label: "Full Front" }],
  });
  assert.equal(invalid, null);
});

test("default group navigation helpers match modal expectations", () => {
  assert.equal(getDefaultStandardPrintSizeGroupId("full_front"), "adult");
  assert.equal(getDefaultStandardPrintSizeGroupId("hat"), "front_panel");
  assert.equal(getDefaultStandardPrintSizeGroupId("pocket"), "pocket");

  const fullFront = DEFAULT_STANDARD_PRINT_SIZES_SETTINGS.placements.find((p) => p.id === "full_front");
  const pocket = DEFAULT_STANDARD_PRINT_SIZES_SETTINGS.placements.find((p) => p.id === "pocket");
  assert.equal(shouldShowStandardPrintSizeGroupSubTabs(fullFront), true);
  assert.equal(shouldShowStandardPrintSizeGroupSubTabs(pocket), false);
});

test("applyStandardPrintSizePreset locks height from width", () => {
  const result = applyStandardPrintSizePreset({
    presetWidthInches: 14,
    pixelWidth: 4200,
    pixelHeight: 3300,
  });
  assert.equal(result.printWidthInches, 14);
  assert.equal(result.printHeightInches, 11);
  assert.equal(result.assessment.canSave, true);
});

test("manual width divergence clears preset key", () => {
  const settings = buildDefaultStandardPrintSizesSettings();
  const cleared = resolveStandardSizePresetKeyAfterManualSizeChange({
    currentPresetKey: "full_front.adult.m",
    settings,
    printWidthInches: 10,
  });
  assert.equal(cleared, undefined);
  const kept = resolveStandardSizePresetKeyAfterManualSizeChange({
    currentPresetKey: "full_front.adult.m",
    settings,
    printWidthInches: 11,
  });
  assert.equal(kept, "full_front.adult.m");
});

test("retired preset keys resolve as unknown without mutating dimensions logic", () => {
  assert.equal(
    formatStandardPrintSizeSelectionLabel(
      DEFAULT_STANDARD_PRINT_SIZES_SETTINGS,
      "full_front.adult.m_l",
    ),
    null,
  );
});

test("formatStandardPrintSizeSelectionLabel supports compact card label", () => {
  assert.equal(
    formatStandardPrintSizeSelectionLabel(
      DEFAULT_STANDARD_PRINT_SIZES_SETTINGS,
      "full_front.adult.m",
      { compact: true },
    ),
    "Full Front · M",
  );
});

test("printInchesMatchAtPresetPrecision rounds consistently", () => {
  assert.equal(printInchesMatchAtPresetPrecision(11.001, 11), true);
  assert.equal(printInchesMatchAtPresetPrecision(10.99, 11), false);
});

test("Left Chest Adult 3XL width matches approved table", () => {
  assert.equal(findPreset("left_chest.adult.3xl")?.widthInches, 4.25);
});

test("resolveStandardPrintSizesSettings reads defaultPrintRequestWidthInches when valid", () => {
  const resolved = resolveStandardPrintSizesSettings({
    defaultPrintRequestWidthInches: 10.5,
    placements: DEFAULT_STANDARD_PRINT_SIZES_SETTINGS.placements,
  });
  assert.equal(resolved.defaultPrintRequestWidthInches, 10.5);
});

test("parseStandardPrintSizesSettingsInput rejects invalid defaultPrintRequestWidthInches", () => {
  const invalid = parseStandardPrintSizesSettingsInput({
    defaultPrintRequestWidthInches: 0,
    placements: DEFAULT_STANDARD_PRINT_SIZES_SETTINGS.placements,
  });
  assert.equal(invalid, null);
});

test("parseStandardPrintSizesSettingsInput round-trips decimal default width", () => {
  const parsed = parseStandardPrintSizesSettingsInput({
    version: 1,
    defaultPrintRequestWidthInches: 11.5,
    placements: DEFAULT_STANDARD_PRINT_SIZES_SETTINGS.placements,
  });
  assert.ok(parsed);
  assert.equal(parsed?.defaultPrintRequestWidthInches, 11.5);
});

test("parseStandardPrintSizesSettingsInput rejects default width above 12 inches", () => {
  const invalid = parseStandardPrintSizesSettingsInput({
    defaultPrintRequestWidthInches: 12.01,
    placements: DEFAULT_STANDARD_PRINT_SIZES_SETTINGS.placements,
  });
  assert.equal(invalid, null);
});

test("parseStandardPrintSizesSettingsInput accepts default width at 12 inches", () => {
  const parsed = parseStandardPrintSizesSettingsInput({
    version: 1,
    defaultPrintRequestWidthInches: 12,
    placements: DEFAULT_STANDARD_PRINT_SIZES_SETTINGS.placements,
  });
  assert.ok(parsed);
  assert.equal(parsed?.defaultPrintRequestWidthInches, 12);
});
