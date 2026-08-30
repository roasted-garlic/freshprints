import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  formatImportSessionSettingsSummary,
  IMPORT_SESSION_DEFAULT_SETTINGS,
} from "../../constants/importSessionSettings";
import { BATCH_IMPORT_INITIAL_STATE } from "../../constants/batchImportInitialState";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test("import session defaults are Normal / Auto", () => {
  assert.equal(IMPORT_SESSION_DEFAULT_SETTINGS.halftoneMode, "normal");
  assert.equal(IMPORT_SESSION_DEFAULT_SETTINGS.backgroundMode, "auto");
  assert.equal(
    formatImportSessionSettingsSummary(IMPORT_SESSION_DEFAULT_SETTINGS),
    "Halftone: Normal · Background: Auto",
  );
  assert.equal("halftoneMode" in BATCH_IMPORT_INITIAL_STATE, false);
  assert.equal("backgroundMode" in BATCH_IMPORT_INITIAL_STATE, false);
});

test("Imports page hosts global session settings in header accessory + modal", () => {
  const page = readFileSync(path.join(__dirname, "../../pages/ImportsPage.tsx"), "utf8");
  assert.match(page, /ImportSessionSettingsHeaderAccessory/);
  assert.match(page, /ImportSessionSettingsModal/);
  assert.match(page, /useImportSessionSettings/);
  assert.match(page, /imports-session-status/);
  assert.match(page, /accessory:\s*headerAccessory/);
  assert.match(page, /getSessionSettings/);
  assert.doesNotMatch(page, /summaryText=\{sessionSettings\.summaryText\}/);

  const header = readFileSync(
    path.join(__dirname, "../../../../shared/components/AppHeader.tsx"),
    "utf8",
  );
  assert.match(header, /accessory/);
  const accessoryIdx = header.indexOf("{accessory ?? null}");
  const bellIdx = header.indexOf("<StaffInboxBellButton");
  assert.ok(accessoryIdx > 0 && accessoryIdx < bellIdx);

  const panel = readFileSync(path.join(__dirname, "BatchImportPanel.tsx"), "utf8");
  assert.doesNotMatch(panel, /BatchImportSessionControls|ImportSessionSettingsForm/);

  const singleHook = readFileSync(
    path.join(__dirname, "../../hooks/useSinglePngImport.ts"),
    "utf8",
  );
  assert.match(singleHook, /getSessionSettings/);
  assert.match(singleHook, /halftoneMode:\s*sessionSettings\.halftoneMode/);
});

test("BatchImportPanel no longer embeds session controls; AI Review / catalog filter untouched", () => {
  const aiReviewForm = readFileSync(
    path.join(__dirname, "../../../ai-review/components/AiReviewFormPanel.tsx"),
    "utf8",
  );
  assert.match(aiReviewForm, /halftoneStaffDecision|markAsHalftone|Halftone/);

  const catalogFilterSource = readFileSync(
    path.join(__dirname, "../../../designs/utils/designLibrarySearch.ts"),
    "utf8",
  );
  assert.match(catalogFilterSource, /CANONICAL_HALFTONE_TAG\s*=\s*"halftone"/);
  assert.match(catalogFilterSource, /setHalftoneInSelectedTags/);
});
