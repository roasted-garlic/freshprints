import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rendererRoot = path.resolve(__dirname, "../..");
const featuresRoot = path.resolve(rendererRoot, "features");

const sidebarSource = readFileSync(path.join(__dirname, "Sidebar.tsx"), "utf8");
const settingsPageSource = readFileSync(
  path.join(featuresRoot, "settings/pages/SettingsPage.tsx"),
  "utf8",
);
const helperSettingsPageSource = readFileSync(
  path.join(featuresRoot, "settings/pages/HelperSettingsPage.tsx"),
  "utf8",
);
const appRoutesSource = readFileSync(path.join(rendererRoot, "routes/AppRoutes.tsx"), "utf8");
const sectionSource = readFileSync(
  path.join(featuresRoot, "settings/components/StudioUpdatesSettingsSection.tsx"),
  "utf8",
);

test("Sidebar no longer hosts a separate Studio Updates footer entry", () => {
  assert.doesNotMatch(sidebarSource, /Studio Updates/);
  assert.doesNotMatch(sidebarSource, /StudioUpdatesModal/);
  assert.doesNotMatch(sidebarSource, /RefreshCw/);
});

test("Sidebar Settings nav is available to helpers via accessSettingsPage", () => {
  assert.match(
    sidebarSource,
    /\{\s*kind:\s*"route",\s*icon:\s*Settings,\s*label:\s*"Settings",\s*to:\s*"\/settings",\s*permission:\s*"accessSettingsPage"\s*\}/,
  );
});

test("Settings route allows helpers through accessSettingsPage", () => {
  const settingsRoute = appRoutesSource.slice(
    appRoutesSource.indexOf('path="/settings"'),
    appRoutesSource.indexOf('path="/settings"') + 280,
  );
  assert.match(settingsRoute, /ProtectedRoute\s+permission="accessSettingsPage"/);
});

test("SettingsPage routes helpers through isHelper before ManageableSettingsPage", () => {
  assert.match(settingsPageSource, /permissionService\.isHelper\(user\)/);
  assert.match(settingsPageSource, /return <HelperSettingsPage/);
  assert.match(settingsPageSource, /canViewAdministrativeSettings/);
  assert.doesNotMatch(
    settingsPageSource,
    /tabs\.push\(\{ id: "aiEnrichment"[\s\S]*?\}\);\s*\n\s*tabs\.push\(\{ id: "studioUpdates"/,
  );
});

test("HelperSettingsPage hosts only StudioUpdatesSettingsSection", () => {
  assert.match(helperSettingsPageSource, /StudioUpdatesSettingsSection/);
  assert.doesNotMatch(helperSettingsPageSource, /aiEnrichment|useAiEnrichmentSettings/);
});

test("Manageable settings still hosts Studio updates tab for owner/admin", () => {
  assert.match(settingsPageSource, /StudioUpdatesSettingsSection/);
  assert.match(settingsPageSource, /studioUpdates/);
});

test("StudioUpdatesSettingsSection owns useStudioUpdate (not Sidebar)", () => {
  assert.match(sectionSource, /useStudioUpdate/);
  assert.doesNotMatch(sidebarSource, /useStudioUpdate/);
  assert.doesNotMatch(sidebarSource, /checkForUpdate|restartAndInstall/);
});
