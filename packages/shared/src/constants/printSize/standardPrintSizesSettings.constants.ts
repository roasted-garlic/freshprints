import { MAX_STANDARD_PRINT_REQUEST_SIZE_INCHES } from "../../utils/printRequestItemSizing";
import { PRINT_INCHES_DECIMAL_PLACES } from "../printSize.constants";

export const STANDARD_PRINT_SIZES_SETTINGS_DOC_ID = "standardPrintSizes";

export const STANDARD_PRINT_SIZE_WIDTH_MIN_INCHES = 0.01;
export const STANDARD_PRINT_SIZE_WIDTH_MAX_INCHES = MAX_STANDARD_PRINT_REQUEST_SIZE_INCHES;

export type StandardPrintSizePlacementId =
  | "full_front"
  | "full_back"
  | "back_collar"
  | "left_chest"
  | "sleeve"
  | "pocket"
  | "hat";

export type StandardPrintSizeGroupId =
  | "adult"
  | "youth"
  | "toddler"
  | "infant"
  | "front_panel"
  | "side_panel"
  | "pocket";

export type StandardPrintSizePresetKey = string;

export interface StandardPrintSizePreset {
  key: StandardPrintSizePresetKey;
  label: string;
  widthInches: number;
  enabled: boolean;
  order: number;
}

export interface StandardPrintSizeGroupConfig {
  id: StandardPrintSizeGroupId;
  label: string;
  presets: StandardPrintSizePreset[];
}

export interface StandardPrintSizePlacementConfig {
  id: StandardPrintSizePlacementId;
  label: string;
  enabled: boolean;
  groups: StandardPrintSizeGroupConfig[];
}

export interface StandardPrintSizesSettings {
  version: 1;
  placements: StandardPrintSizePlacementConfig[];
  /** Runtime default width for new generic Print Request items (snapshot-at-create). */
  defaultPrintRequestWidthInches?: number;
  updatedAt?: unknown;
  updatedBy?: string;
}

export const STANDARD_PRINT_SIZE_PLACEMENT_ORDER: readonly StandardPrintSizePlacementId[] = [
  "full_front",
  "full_back",
  "back_collar",
  "left_chest",
  "sleeve",
  "pocket",
  "hat",
];

export const STANDARD_PRINT_SIZE_PLACEMENT_LABELS: Record<StandardPrintSizePlacementId, string> = {
  full_front: "Full Front",
  full_back: "Full Back",
  back_collar: "Back Collar",
  left_chest: "Left Chest",
  sleeve: "Sleeve",
  pocket: "Pocket",
  hat: "Hat",
};

export const STANDARD_PRINT_SIZE_GROUP_LABELS: Record<StandardPrintSizeGroupId, string> = {
  adult: "Adult",
  youth: "Youth",
  toddler: "Toddler",
  infant: "Infant",
  front_panel: "Front Panel",
  side_panel: "Side Panel",
  pocket: "Pocket",
};

const PLACEMENT_GROUP_IDS: Record<StandardPrintSizePlacementId, readonly StandardPrintSizeGroupId[]> =
  {
    full_front: ["adult", "youth", "toddler", "infant"],
    full_back: ["adult", "youth", "toddler", "infant"],
    back_collar: ["adult", "youth", "toddler", "infant"],
    left_chest: ["adult", "youth", "toddler", "infant"],
    sleeve: ["adult", "youth", "toddler", "infant"],
    pocket: ["pocket"],
    hat: ["front_panel", "side_panel"],
  };

type SeedPreset = {
  groupId: StandardPrintSizeGroupId;
  keySuffix: string;
  label: string;
  widthInches: number;
};

type PresetRow = readonly [keySuffix: string, label: string, widthInches: number];

function groupPresetRows(
  groupId: StandardPrintSizeGroupId,
  rows: readonly PresetRow[],
): SeedPreset[] {
  return rows.map(([keySuffix, label, widthInches]) => ({
    groupId,
    keySuffix,
    label,
    widthInches,
  }));
}

const ADULT_GARMENT_ROWS: readonly PresetRow[] = [
  ["xs", "XS", 9.5],
  ["s", "S", 10],
  ["m", "M", 11],
  ["l", "L", 11.5],
  ["xl", "XL", 12],
  ["2xl", "2XL", 13],
  ["3xl", "3XL", 14],
  ["4xl", "4XL", 16],
  ["5xl", "5XL", 17],
];

const YOUTH_GARMENT_ROWS: readonly PresetRow[] = [
  ["yxs", "YXS", 7.5],
  ["ys", "YS", 8.5],
  ["ym", "YM", 9.5],
  ["yl", "YL", 10],
  ["yxl", "YXL", 10.5],
  ["y2xl", "Y2XL", 11],
];

const TODDLER_GARMENT_ROWS: readonly PresetRow[] = [
  ["2t", "2T", 5.5],
  ["3t", "3T", 6],
  ["4t", "4T", 6.5],
  ["5t", "5T", 7],
  ["6t", "6T", 7.5],
];

const INFANT_GARMENT_ROWS: readonly PresetRow[] = [
  ["0_3m", "0-3M", 4],
  ["3_6m", "3-6M", 4.5],
  ["6_12m", "6-12M", 5],
  ["12_18m", "12-18M", 5.5],
  ["18_24m", "18-24M", 6],
];

const ADULT_FULL_BACK_ROWS: readonly PresetRow[] = [
  ["xs", "XS", 10],
  ["s", "S", 10.5],
  ["m", "M", 11.5],
  ["l", "L", 12],
  ["xl", "XL", 12.5],
  ["2xl", "2XL", 13.5],
  ["3xl", "3XL", 14.5],
  ["4xl", "4XL", 16],
  ["5xl", "5XL", 17],
];

const YOUTH_FULL_BACK_ROWS: readonly PresetRow[] = [
  ["yxs", "YXS", 7.5],
  ["ys", "YS", 8.5],
  ["ym", "YM", 9.5],
  ["yl", "YL", 10.5],
  ["yxl", "YXL", 11],
  ["y2xl", "Y2XL", 11.5],
];

const ADULT_LEFT_CHEST_ROWS: readonly PresetRow[] = [
  ["xs", "XS", 3.25],
  ["s", "S", 3.5],
  ["m", "M", 3.75],
  ["l", "L", 3.75],
  ["xl", "XL", 4],
  ["2xl", "2XL", 4.25],
  ["3xl", "3XL", 4.25],
  ["4xl", "4XL", 4.5],
  ["5xl", "5XL", 4.5],
];

const YOUTH_LEFT_CHEST_ROWS: readonly PresetRow[] = [
  ["yxs", "YXS", 2.75],
  ["ys", "YS", 3],
  ["ym", "YM", 3.25],
  ["yl", "YL", 3.5],
  ["yxl", "YXL", 3.5],
  ["y2xl", "Y2XL", 3.75],
];

const TODDLER_LEFT_CHEST_ROWS: readonly PresetRow[] = [
  ["2t", "2T", 2.25],
  ["3t", "3T", 2.5],
  ["4t", "4T", 2.5],
  ["5t", "5T", 2.75],
  ["6t", "6T", 2.75],
];

const INFANT_LEFT_CHEST_ROWS: readonly PresetRow[] = [
  ["0_3m", "0-3M", 1.5],
  ["3_6m", "3-6M", 1.5],
  ["6_12m", "6-12M", 1.75],
  ["12_18m", "12-18M", 2],
  ["18_24m", "18-24M", 2],
];

const ADULT_BACK_COLLAR_ROWS: readonly PresetRow[] = [
  ["xs", "XS", 3],
  ["s", "S", 3],
  ["m", "M", 3.25],
  ["l", "L", 3.25],
  ["xl", "XL", 3.5],
  ["2xl", "2XL", 3.5],
  ["3xl", "3XL", 3.5],
  ["4xl", "4XL", 3.75],
  ["5xl", "5XL", 3.75],
];

const YOUTH_BACK_COLLAR_ROWS: readonly PresetRow[] = [
  ["yxs", "YXS", 2.5],
  ["ys", "YS", 2.75],
  ["ym", "YM", 2.75],
  ["yl", "YL", 3],
  ["yxl", "YXL", 3],
  ["y2xl", "Y2XL", 3],
];

const TODDLER_BACK_COLLAR_ROWS: readonly PresetRow[] = [
  ["2t", "2T", 2.25],
  ["3t", "3T", 2.5],
  ["4t", "4T", 2.5],
  ["5t", "5T", 2.5],
  ["6t", "6T", 2.5],
];

const INFANT_BACK_COLLAR_ROWS: readonly PresetRow[] = [
  ["0_3m", "0-3M", 2],
  ["3_6m", "3-6M", 2],
  ["6_12m", "6-12M", 2],
  ["12_18m", "12-18M", 2.25],
  ["18_24m", "18-24M", 2.25],
];

const ADULT_SLEEVE_ROWS: readonly PresetRow[] = [
  ["xs", "XS", 3],
  ["s", "S", 3],
  ["m", "M", 3.25],
  ["l", "L", 3.25],
  ["xl", "XL", 3.5],
  ["2xl", "2XL", 3.5],
  ["3xl", "3XL", 3.75],
  ["4xl", "4XL", 3.75],
  ["5xl", "5XL", 4],
];

const YOUTH_SLEEVE_ROWS: readonly PresetRow[] = [
  ["yxs", "YXS", 2.25],
  ["ys", "YS", 2.5],
  ["ym", "YM", 2.5],
  ["yl", "YL", 2.75],
  ["yxl", "YXL", 3],
  ["y2xl", "Y2XL", 3],
];

const TODDLER_SLEEVE_ROWS: readonly PresetRow[] = [
  ["2t", "2T", 1.75],
  ["3t", "3T", 2],
  ["4t", "4T", 2],
  ["5t", "5T", 2.25],
  ["6t", "6T", 2.25],
];

const INFANT_SLEEVE_ROWS: readonly PresetRow[] = [
  ["0_3m", "0-3M", 1.25],
  ["3_6m", "3-6M", 1.25],
  ["6_12m", "6-12M", 1.5],
  ["12_18m", "12-18M", 1.5],
  ["18_24m", "18-24M", 1.75],
];

function buildPreset(
  placementId: StandardPrintSizePlacementId,
  groupId: StandardPrintSizeGroupId,
  keySuffix: string,
  label: string,
  widthInches: number,
  order: number,
): StandardPrintSizePreset {
  return {
    key: `${placementId}.${groupId}.${keySuffix}`,
    label,
    widthInches,
    enabled: true,
    order,
  };
}

function buildPlacement(
  placementId: StandardPrintSizePlacementId,
  seeds: SeedPreset[],
): StandardPrintSizePlacementConfig {
  const groupsById = new Map<StandardPrintSizeGroupId, StandardPrintSizePreset[]>();

  seeds.forEach((seed, index) => {
    const preset = buildPreset(
      placementId,
      seed.groupId,
      seed.keySuffix,
      seed.label,
      seed.widthInches,
      index + 1,
    );
    const existing = groupsById.get(seed.groupId) ?? [];
    existing.push(preset);
    groupsById.set(seed.groupId, existing);
  });

  const groups: StandardPrintSizeGroupConfig[] = PLACEMENT_GROUP_IDS[placementId]
    .filter((groupId) => groupsById.has(groupId))
    .map((groupId) => ({
      id: groupId,
      label: STANDARD_PRINT_SIZE_GROUP_LABELS[groupId],
      presets: groupsById.get(groupId) ?? [],
    }));

  return {
    id: placementId,
    label: STANDARD_PRINT_SIZE_PLACEMENT_LABELS[placementId],
    enabled: true,
    groups,
  };
}

/** Fresh Prints Standard Size Defaults v1 — target widths only (2026-08-29 corrective). */
export function buildDefaultStandardPrintSizesSettings(): StandardPrintSizesSettings {
  return {
    version: 1,
    placements: [
      buildPlacement("full_front", [
        ...groupPresetRows("adult", ADULT_GARMENT_ROWS),
        ...groupPresetRows("youth", YOUTH_GARMENT_ROWS),
        ...groupPresetRows("toddler", TODDLER_GARMENT_ROWS),
        ...groupPresetRows("infant", INFANT_GARMENT_ROWS),
      ]),
      buildPlacement("full_back", [
        ...groupPresetRows("adult", ADULT_FULL_BACK_ROWS),
        ...groupPresetRows("youth", YOUTH_FULL_BACK_ROWS),
        ...groupPresetRows("toddler", TODDLER_GARMENT_ROWS),
        ...groupPresetRows("infant", INFANT_GARMENT_ROWS),
      ]),
      buildPlacement("back_collar", [
        ...groupPresetRows("adult", ADULT_BACK_COLLAR_ROWS),
        ...groupPresetRows("youth", YOUTH_BACK_COLLAR_ROWS),
        ...groupPresetRows("toddler", TODDLER_BACK_COLLAR_ROWS),
        ...groupPresetRows("infant", INFANT_BACK_COLLAR_ROWS),
      ]),
      buildPlacement("left_chest", [
        ...groupPresetRows("adult", ADULT_LEFT_CHEST_ROWS),
        ...groupPresetRows("youth", YOUTH_LEFT_CHEST_ROWS),
        ...groupPresetRows("toddler", TODDLER_LEFT_CHEST_ROWS),
        ...groupPresetRows("infant", INFANT_LEFT_CHEST_ROWS),
      ]),
      buildPlacement("sleeve", [
        ...groupPresetRows("adult", ADULT_SLEEVE_ROWS),
        ...groupPresetRows("youth", YOUTH_SLEEVE_ROWS),
        ...groupPresetRows("toddler", TODDLER_SLEEVE_ROWS),
        ...groupPresetRows("infant", INFANT_SLEEVE_ROWS),
      ]),
      buildPlacement("pocket", [
        ...groupPresetRows("pocket", [
          ["small", "Small Pocket", 2.5],
          ["medium", "Medium Pocket", 3],
          ["large", "Large Pocket", 3.5],
        ]),
      ]),
      buildPlacement("hat", [
        ...groupPresetRows("front_panel", [
          ["small", "Small", 3.5],
          ["standard", "Standard", 4],
          ["large", "Large", 4.5],
          ["max", "Max", 5],
        ]),
        ...groupPresetRows("side_panel", [
          ["small", "Small", 2],
          ["standard", "Standard", 2.5],
          ["large", "Large", 3],
        ]),
      ]),
    ],
  };
}

export const DEFAULT_STANDARD_PRINT_SIZES_SETTINGS: Readonly<StandardPrintSizesSettings> =
  buildDefaultStandardPrintSizesSettings();

export function getDefaultStandardPrintSizeGroupId(
  placementId: StandardPrintSizePlacementId,
): StandardPrintSizeGroupId {
  if (placementId === "hat") {
    return "front_panel";
  }
  if (placementId === "pocket") {
    return "pocket";
  }
  return "adult";
}

export function shouldShowStandardPrintSizeGroupSubTabs(
  placement: StandardPrintSizePlacementConfig | undefined,
): boolean {
  return (placement?.groups.length ?? 0) > 1;
}

function roundInches(value: number): number {
  const factor = 10 ** PRINT_INCHES_DECIMAL_PLACES;
  return Math.round(value * factor) / factor;
}

function isValidPlacementId(value: unknown): value is StandardPrintSizePlacementId {
  return (
    typeof value === "string" &&
    (STANDARD_PRINT_SIZE_PLACEMENT_ORDER as readonly string[]).includes(value)
  );
}

function isValidGroupId(value: unknown): value is StandardPrintSizeGroupId {
  return typeof value === "string" && value in STANDARD_PRINT_SIZE_GROUP_LABELS;
}

function isValidPresetWidth(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= STANDARD_PRINT_SIZE_WIDTH_MIN_INCHES &&
    value <= STANDARD_PRINT_SIZE_WIDTH_MAX_INCHES
  );
}

export function isValidDefaultPrintRequestWidthInches(value: unknown): value is number {
  return isValidPresetWidth(value) && value > 0;
}

function resolvePreset(raw: unknown, fallback: StandardPrintSizePreset): StandardPrintSizePreset {
  if (!raw || typeof raw !== "object") {
    return fallback;
  }
  const data = raw as Record<string, unknown>;
  const key = typeof data.key === "string" && data.key.length > 0 ? data.key : fallback.key;
  const label = typeof data.label === "string" && data.label.trim() ? data.label.trim() : fallback.label;
  const widthInches = isValidPresetWidth(data.widthInches)
    ? roundInches(data.widthInches)
    : fallback.widthInches;
  const enabled = typeof data.enabled === "boolean" ? data.enabled : fallback.enabled;
  const order =
    typeof data.order === "number" && Number.isFinite(data.order) && data.order > 0
      ? Math.floor(data.order)
      : fallback.order;
  return { key, label, widthInches, enabled, order };
}

function resolveGroup(
  raw: unknown,
  fallback: StandardPrintSizeGroupConfig,
): StandardPrintSizeGroupConfig {
  if (!raw || typeof raw !== "object") {
    return fallback;
  }
  const data = raw as Record<string, unknown>;
  const id = isValidGroupId(data.id) ? data.id : fallback.id;
  const label =
    typeof data.label === "string" && data.label.trim()
      ? data.label.trim()
      : STANDARD_PRINT_SIZE_GROUP_LABELS[id];
  const rawPresets = Array.isArray(data.presets) ? data.presets : [];
  const rawPresetsByKey = new Map<string, unknown>();
  for (const rawPreset of rawPresets) {
    if (!rawPreset || typeof rawPreset !== "object") {
      continue;
    }
    const presetKey = (rawPreset as Record<string, unknown>).key;
    if (typeof presetKey === "string" && presetKey.length > 0) {
      rawPresetsByKey.set(presetKey, rawPreset);
    }
  }
  const presets = fallback.presets.map((fallbackPreset) =>
    resolvePreset(rawPresetsByKey.get(fallbackPreset.key), fallbackPreset),
  );
  return { id, label, presets };
}

function resolvePlacement(
  raw: unknown,
  fallback: StandardPrintSizePlacementConfig,
): StandardPrintSizePlacementConfig {
  if (!raw || typeof raw !== "object") {
    return fallback;
  }
  const data = raw as Record<string, unknown>;
  const id = isValidPlacementId(data.id) ? data.id : fallback.id;
  const label =
    typeof data.label === "string" && data.label.trim()
      ? data.label.trim()
      : STANDARD_PRINT_SIZE_PLACEMENT_LABELS[id];
  const enabled = typeof data.enabled === "boolean" ? data.enabled : fallback.enabled;
  const rawGroups = Array.isArray(data.groups) ? data.groups : [];
  const rawGroupsById = new Map<StandardPrintSizeGroupId, unknown>();
  for (const rawGroup of rawGroups) {
    if (!rawGroup || typeof rawGroup !== "object") {
      continue;
    }
    const groupId = (rawGroup as Record<string, unknown>).id;
    if (isValidGroupId(groupId)) {
      rawGroupsById.set(groupId, rawGroup);
    }
  }
  const groups = fallback.groups.map((fallbackGroup) =>
    resolveGroup(rawGroupsById.get(fallbackGroup.id), fallbackGroup),
  );
  return { id, label, enabled, groups };
}

export function resolveStandardPrintSizesSettings(value: unknown): StandardPrintSizesSettings {
  const defaults = DEFAULT_STANDARD_PRINT_SIZES_SETTINGS;
  if (!value || typeof value !== "object") {
    return buildDefaultStandardPrintSizesSettings();
  }
  const data = value as Record<string, unknown>;
  const rawPlacements = Array.isArray(data.placements) ? data.placements : [];
  const rawPlacementsById = new Map<StandardPrintSizePlacementId, unknown>();
  for (const rawPlacement of rawPlacements) {
    if (!rawPlacement || typeof rawPlacement !== "object") {
      continue;
    }
    const placementId = (rawPlacement as Record<string, unknown>).id;
    if (isValidPlacementId(placementId)) {
      rawPlacementsById.set(placementId, rawPlacement);
    }
  }
  const placements = defaults.placements.map((fallbackPlacement) =>
    resolvePlacement(rawPlacementsById.get(fallbackPlacement.id), fallbackPlacement),
  );
  const settings: StandardPrintSizesSettings = { version: 1, placements };
  if (isValidDefaultPrintRequestWidthInches(data.defaultPrintRequestWidthInches)) {
    settings.defaultPrintRequestWidthInches = roundInches(data.defaultPrintRequestWidthInches);
  }
  if (data.updatedAt !== undefined) {
    settings.updatedAt = data.updatedAt;
  }
  if (typeof data.updatedBy === "string") {
    settings.updatedBy = data.updatedBy;
  }
  return settings;
}

export function findStandardPrintSizePreset(
  settings: StandardPrintSizesSettings,
  key: StandardPrintSizePresetKey | undefined | null,
): StandardPrintSizePreset | undefined {
  if (!key) {
    return undefined;
  }
  for (const placement of settings.placements) {
    if (!placement.enabled) {
      continue;
    }
    for (const group of placement.groups) {
      for (const preset of group.presets) {
        if (preset.key === key && preset.enabled) {
          return preset;
        }
      }
    }
  }
  return undefined;
}

export function findStandardPrintSizePresetContext(
  settings: StandardPrintSizesSettings,
  key: StandardPrintSizePresetKey | undefined | null,
): {
  placement: StandardPrintSizePlacementConfig;
  group: StandardPrintSizeGroupConfig;
  preset: StandardPrintSizePreset;
} | undefined {
  if (!key) {
    return undefined;
  }
  for (const placement of settings.placements) {
    if (!placement.enabled) {
      continue;
    }
    for (const group of placement.groups) {
      for (const preset of group.presets) {
        if (preset.key === key && preset.enabled) {
          return { placement, group, preset };
        }
      }
    }
  }
  return undefined;
}

export function formatStandardPrintSizeSelectionLabel(
  settings: StandardPrintSizesSettings,
  key: StandardPrintSizePresetKey | undefined | null,
  options?: { compact?: boolean },
): string | null {
  const context = findStandardPrintSizePresetContext(settings, key);
  if (!context) {
    return null;
  }
  const { placement, group, preset } = context;
  if (options?.compact) {
    return `${placement.label} · ${preset.label}`;
  }
  return `${placement.label} · ${group.label} · ${preset.label}`;
}

export function listEnabledStandardPrintSizePlacements(
  settings: StandardPrintSizesSettings,
): StandardPrintSizePlacementConfig[] {
  return settings.placements.filter((placement) => placement.enabled);
}

function validateSettingsStructure(settings: StandardPrintSizesSettings): boolean {
  const defaults = DEFAULT_STANDARD_PRINT_SIZES_SETTINGS;
  if (settings.placements.length !== defaults.placements.length) {
    return false;
  }
  for (const fallbackPlacement of defaults.placements) {
    const placement = settings.placements.find((entry) => entry.id === fallbackPlacement.id);
    if (!placement) {
      return false;
    }
    if (placement.groups.length !== fallbackPlacement.groups.length) {
      return false;
    }
    for (const fallbackGroup of fallbackPlacement.groups) {
      const group = placement.groups.find((entry) => entry.id === fallbackGroup.id);
      if (!group || group.presets.length !== fallbackGroup.presets.length) {
        return false;
      }
      for (const fallbackPreset of fallbackGroup.presets) {
        const preset = group.presets.find((entry) => entry.key === fallbackPreset.key);
        if (!preset) {
          return false;
        }
        if (!isValidPresetWidth(preset.widthInches)) {
          return false;
        }
      }
    }
  }
  return true;
}

function validateRawStandardPrintSizesSettingsInput(value: unknown): boolean {
  if (!value || typeof value !== "object") {
    return false;
  }
  const data = value as Record<string, unknown>;
  if (!Array.isArray(data.placements)) {
    return false;
  }
  const defaults = DEFAULT_STANDARD_PRINT_SIZES_SETTINGS;
  if (data.placements.length !== defaults.placements.length) {
    return false;
  }
  for (const fallbackPlacement of defaults.placements) {
    const rawPlacement = data.placements.find(
      (entry) =>
        entry &&
        typeof entry === "object" &&
        (entry as Record<string, unknown>).id === fallbackPlacement.id,
    );
    if (!rawPlacement || typeof rawPlacement !== "object") {
      return false;
    }
    const rawGroups = (rawPlacement as Record<string, unknown>).groups;
    if (!Array.isArray(rawGroups) || rawGroups.length !== fallbackPlacement.groups.length) {
      return false;
    }
    for (const fallbackGroup of fallbackPlacement.groups) {
      const rawGroup = rawGroups.find(
        (entry) =>
          entry &&
          typeof entry === "object" &&
          (entry as Record<string, unknown>).id === fallbackGroup.id,
      );
      if (!rawGroup || typeof rawGroup !== "object") {
        return false;
      }
      const rawPresets = (rawGroup as Record<string, unknown>).presets;
      if (!Array.isArray(rawPresets) || rawPresets.length !== fallbackGroup.presets.length) {
        return false;
      }
      for (const fallbackPreset of fallbackGroup.presets) {
        const rawPreset = rawPresets.find(
          (entry) =>
            entry &&
            typeof entry === "object" &&
            (entry as Record<string, unknown>).key === fallbackPreset.key,
        );
        if (!rawPreset) {
          return false;
        }
      }
    }
  }
  const defaultWidth = (value as Record<string, unknown>).defaultPrintRequestWidthInches;
  if (
    defaultWidth !== undefined &&
    defaultWidth !== null &&
    !isValidDefaultPrintRequestWidthInches(defaultWidth)
  ) {
    return false;
  }
  return true;
}

export function parseStandardPrintSizesSettingsInput(
  value: unknown,
): StandardPrintSizesSettings | null {
  if (!validateRawStandardPrintSizesSettingsInput(value)) {
    return null;
  }
  const resolved = resolveStandardPrintSizesSettings(value);
  if (!validateSettingsStructure(resolved)) {
    return null;
  }
  return resolved;
}

export function printInchesMatchAtPresetPrecision(left: number, right: number): boolean {
  return roundInches(left) === roundInches(right);
}

export function resolveStandardSizePresetKeyAfterManualSizeChange(input: {
  currentPresetKey?: string | null;
  settings: StandardPrintSizesSettings;
  printWidthInches: number;
}): string | undefined {
  if (!input.currentPresetKey) {
    return undefined;
  }
  const preset = findStandardPrintSizePreset(input.settings, input.currentPresetKey);
  if (!preset) {
    return undefined;
  }
  if (!printInchesMatchAtPresetPrecision(input.printWidthInches, preset.widthInches)) {
    return undefined;
  }
  return input.currentPresetKey;
}

/** Retired provisional preset key suffixes excluded from v1 defaults. */
export const RETIRED_STANDARD_PRINT_SIZE_PRESET_KEY_SUFFIXES = [
  "xxl_plus",
  "xs_s",
  "m_l",
  "xs_m",
  "l_plus",
  "m_plus",
] as const;
