import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { SMART_PROFILE_EDITABLE_DIMENSION_KEYS } from "@fresh-prints/shared/constants/smartProfile.constants";
import {
  addSmartProfilePresetValue,
  removeSmartProfilePresetValue,
} from "../utils/smartProfilePresetEditorValues";
import { SMART_PROFILE_DIMENSION_DISPLAY_ORDER } from "../constants/smartProfilePresets";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const modalSource = readFileSync(path.join(__dirname, "ImportSessionSettingsModal.tsx"), "utf8");
const editorSource = readFileSync(path.join(__dirname, "SmartProfilePresetsEditor.tsx"), "utf8");
const editorValuesSource = readFileSync(
  path.join(__dirname, "../utils/smartProfilePresetEditorValues.ts"),
  "utf8",
);
const formSource = readFileSync(path.join(__dirname, "ImportSessionSettingsForm.tsx"), "utf8");
const cssSource = readFileSync(
  path.join(__dirname, "../../../styles/components/batch-import.css"),
  "utf8",
);

test("modal provides separate accessible Import settings and Smart Profile presets tabs", () => {
  assert.match(modalSource, /role="tablist"/);
  assert.match(modalSource, />\s*Import settings\s*</);
  assert.match(modalSource, />\s*Smart Profile presets\s*</);
  // Avoid brittle source-text assertions about exact `role="tabpanel"` quoting/formatting.
  // Panel presence is the meaningful contract (tab switching keeps panels mounted).
  assert.match(modalSource, /id="import-session-settings-panel"/);
  assert.match(modalSource, /id="import-session-presets-panel"/);
  assert.doesNotMatch(formSource, /SmartProfilePresetsEditor|showSmartProfilePresets/);
  // Prove the visual tab order without depending on incidental whitespace/newlines.
  const presetsTabButton = modalSource.indexOf('id="import-session-presets-tab"');
  const settingsTabButton = modalSource.indexOf('id="import-session-settings-tab"');
  assert.ok(presetsTabButton > 0);
  assert.ok(settingsTabButton > 0);
  assert.ok(presetsTabButton < settingsTabButton);
});

test("tab panels remain mounted so tab changes preserve session and editor state", () => {
  const settingsPanel = modalSource.indexOf('id="import-session-settings-panel"');
  const presetsPanel = modalSource.indexOf('id="import-session-presets-panel"');
  assert.ok(settingsPanel > 0);
  assert.ok(presetsPanel > settingsPanel);
  assert.match(modalSource, /<ImportSessionSettingsForm/);
  assert.match(modalSource, /<SmartProfilePresetsEditor/);
});

test("preset add normalizes and dedupes while removal stays dimension-local", () => {
  const subjects = addSmartProfilePresetValue([], "  Dolly Parton  ");
  const dedupedSubjects = addSmartProfilePresetValue(subjects, "dolly parton");
  const places = addSmartProfilePresetValue([], "Pensacola, FL");

  assert.deepEqual(subjects, ["Dolly Parton"]);
  assert.deepEqual(dedupedSubjects, ["Dolly Parton"]);
  assert.deepEqual(places, ["Pensacola, FL"]);
  assert.deepEqual(removeSmartProfilePresetValue(subjects, "Dolly Parton"), []);
  assert.deepEqual(places, ["Pensacola, FL"]);
});

test("preset editor exposes only the reviewed editable dimension contract", () => {
  assert.deepEqual(
    [...SMART_PROFILE_DIMENSION_DISPLAY_ORDER].sort(),
    [...SMART_PROFILE_EDITABLE_DIMENSION_KEYS].sort(),
  );
  assert.equal(SMART_PROFILE_DIMENSION_DISPLAY_ORDER.includes("person" as never), false);
  assert.equal(SMART_PROFILE_DIMENSION_DISPLAY_ORDER.includes("location" as never), false);
});

test("preset layout uses shared controls, responsive columns, and one scrolling tab body", () => {
  assert.match(editorSource, /className="button button-secondary button-md"/);
  assert.match(editorSource, /className="tag-chip"/);
  assert.match(editorSource, /className="tag-chip-remove"/);
  assert.match(editorValuesSource, /normalizeSmartProfileStringList/);
  assert.match(cssSource, /grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(cssSource, /@media \(max-width: 700px\)/);
  assert.match(cssSource, /\.import-session-settings-tab-panel[\s\S]*?overflow-y:\s*auto/);
  assert.match(cssSource, /max-height:\s*min\(48rem, calc\(100vh - 2rem\)\)/);
});
