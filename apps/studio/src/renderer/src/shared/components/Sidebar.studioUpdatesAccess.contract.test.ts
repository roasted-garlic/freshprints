import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rendererRoot = path.resolve(__dirname, "../..");
const featuresRoot = path.resolve(rendererRoot, "features");

const sidebarSource = readFileSync(path.join(__dirname, "Sidebar.tsx"), "utf8");
const modalSource = readFileSync(
  path.join(featuresRoot, "settings/components/StudioUpdatesModal.tsx"),
  "utf8",
);
const settingsPageSource = readFileSync(
  path.join(featuresRoot, "settings/pages/SettingsPage.tsx"),
  "utf8",
);
const appRoutesSource = readFileSync(path.join(rendererRoot, "routes/AppRoutes.tsx"), "utf8");
const sectionSource = readFileSync(
  path.join(featuresRoot, "settings/components/StudioUpdatesSettingsSection.tsx"),
  "utf8",
);

test("Sidebar Studio Updates visibility uses canAccessDesktopApp (no new permission)", () => {
  assert.match(
    sidebarSource,
    /canAccessStudioUpdates\s*=\s*permissionService\.canAccessDesktopApp\(user\)/,
  );
  assert.match(sidebarSource, /StudioUpdatesModal/);
  // Scope to the footer button only — Settings nav still uses manageSettings earlier in-file.
  const buttonIdx = sidebarSource.indexOf("{canAccessStudioUpdates ?");
  assert.ok(buttonIdx >= 0, "expected canAccessStudioUpdates footer button");
  const updatesBlock = sidebarSource.slice(buttonIdx, buttonIdx + 800);
  assert.match(updatesBlock, /Studio Updates/);
  assert.doesNotMatch(updatesBlock, /manageSettings/);
});

test("Sidebar Settings nav remains manageSettings-gated", () => {
  assert.match(
    sidebarSource,
    /\{\s*kind:\s*"route",\s*icon:\s*Settings,\s*label:\s*"Settings",\s*to:\s*"\/settings",\s*permission:\s*"manageSettings"\s*\}/,
  );
});

test("Settings route remains ProtectedRoute manageSettings", () => {
  const settingsRoute = appRoutesSource.slice(
    appRoutesSource.indexOf('path="/settings"'),
    appRoutesSource.indexOf('path="/settings"') + 280,
  );
  assert.match(settingsRoute, /ProtectedRoute\s+permission="manageSettings"/);
});

test("StudioUpdatesModal reuses StudioUpdatesSettingsSection without updater IPC imports", () => {
  assert.match(modalSource, /StudioUpdatesSettingsSection/);
  assert.match(modalSource, /modal-overlay/);
  assert.match(modalSource, /createPortal/);
  assert.match(modalSource, /document\.body/);
  assert.match(modalSource, /studio-updates-modal-overlay/);
  assert.match(modalSource, /studio-updates-modal-panel/);
  assert.match(modalSource, /role="dialog"/);
  const importLines = modalSource
    .split(/\r?\n/)
    .filter((line) => /^\s*import\b/.test(line))
    .join("\n");
  assert.doesNotMatch(importLines, /studioUpdateService|studioUpdateIpc|useStudioUpdate/);
});

test("SettingsPage still hosts StudioUpdatesSettingsSection for owner/admin Settings path", () => {
  assert.match(settingsPageSource, /StudioUpdatesSettingsSection/);
});

test("StudioUpdatesSettingsSection still owns useStudioUpdate (no duplication in Sidebar)", () => {
  assert.match(sectionSource, /useStudioUpdate/);
  assert.doesNotMatch(sidebarSource, /useStudioUpdate/);
  assert.doesNotMatch(sidebarSource, /checkForUpdate|restartAndInstall/);
});
