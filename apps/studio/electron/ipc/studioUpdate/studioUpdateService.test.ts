import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

// studioUpdateService.ts imports `electron` at module scope, which is unavailable outside a real
// Electron process — it cannot be safely `import()`ed here (see the rest of this repo's existing
// convention of not directly unit-testing files with a top-level `from "electron"` import). The
// call-gating logic (whether restart/install is even reachable) is already covered by
// canRestartAndInstall's pure tests in studioUpdateStateTransitions.test.ts. This test instead
// guards the exact quitAndInstall(...) call-site arguments at the source level, so a future edit
// cannot silently reintroduce the non-silent NSIS wizard for automatic updates without this test
// failing — it is a regression guard, not a behavioral unit test of the Electron API call itself.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const source = readFileSync(path.join(__dirname, "studioUpdateService.ts"), "utf8");

test("restartAndInstallStudioUpdate calls quitAndInstall with isSilent=true", () => {
  assert.match(source, /autoUpdater\.quitAndInstall\(true,\s*true\)/);
});

test("the source no longer calls quitAndInstall with isSilent=false", () => {
  assert.doesNotMatch(source, /autoUpdater\.quitAndInstall\(false,\s*true\)/);
});

test("restartAndInstallStudioUpdate remains gated behind canRestartAndInstall and the pending-download flag", () => {
  assert.match(
    source,
    /!canRestartAndInstall\(state\)\s*\|\|\s*!hasPendingDownloadedUpdate\s*\|\|\s*!autoUpdater/,
  );
});

test("quitAndInstall is only called from restartAndInstallStudioUpdate, not from any automatic/periodic path", () => {
  const quitAndInstallOccurrences = source.match(/\.quitAndInstall\(/g) ?? [];
  assert.equal(
    quitAndInstallOccurrences.length,
    1,
    "quitAndInstall should be called from exactly one place: the explicit user-triggered restartAndInstallStudioUpdate",
  );
});

test("global updater error handler uses sticky activeErrorContext (not hard-coded check)", () => {
  assert.match(source, /handleUpdaterError\(error,\s*activeErrorContext\)/);
  assert.doesNotMatch(
    source,
    /updater\.on\("error",\s*\(error\)\s*=>\s*\{\s*handleUpdaterError\(error,\s*"check"\)/,
  );
});

test("restartAndInstall sets install context before quitAndInstall and does not reset it in that function", () => {
  const start = source.indexOf("export function restartAndInstallStudioUpdate");
  const end = source.indexOf("export function postponeStudioUpdate");
  assert.ok(start >= 0 && end > start);
  const restartFn = source.slice(start, end);
  const quitIdx = restartFn.indexOf("autoUpdater.quitAndInstall(true, true)");
  assert.ok(quitIdx > 0);
  const beforeQuit = restartFn.slice(0, quitIdx);
  const afterQuit = restartFn.slice(quitIdx);
  assert.match(beforeQuit, /activeErrorContext\s*=\s*"install"/);
  assert.doesNotMatch(afterQuit, /activeErrorContext\s*=/);
});

test("check and download paths set their own activeErrorContext", () => {
  assert.match(source, /activeErrorContext\s*=\s*"check"/);
  assert.match(source, /activeErrorContext\s*=\s*"download"/);
});
