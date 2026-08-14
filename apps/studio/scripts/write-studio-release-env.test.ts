import assert from "node:assert/strict";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scriptPath = path.join(__dirname, "write-studio-release-env.mjs");

function runWriter(env: Record<string, string>) {
  const studioDir = mkdtempSync(path.join(tmpdir(), "studio-env-"));
  const scriptsDir = path.join(studioDir, "scripts");
  mkdirSync(scriptsDir);
  copyFileSync(scriptPath, path.join(scriptsDir, "write-studio-release-env.mjs"));
  const result = spawnSync(process.execPath, [path.join(scriptsDir, "write-studio-release-env.mjs")], {
    env: { ...process.env, ...env },
    encoding: "utf8",
  });
  return { result, studioDir };
}

const prodFirebase = {
  RELEASE_TYPE: "stable",
  PROD_FIREBASE_API_KEY: "k",
  PROD_FIREBASE_AUTH_DOMAIN: "fresh-prints-prod.firebaseapp.com",
  PROD_FIREBASE_PROJECT_ID: "fresh-prints-prod",
  PROD_FIREBASE_STORAGE_BUCKET: "fresh-prints-prod.appspot.com",
  PROD_FIREBASE_MESSAGING_SENDER_ID: "1",
  PROD_FIREBASE_APP_ID: "1:1:web:1",
  PROD_ALGOLIA_APP_ID: "Z1FVCM5QUX",
  PROD_ALGOLIA_SEARCH_API_KEY: "search-only-test",
  PROD_ALGOLIA_INDEX_NAME: "portal_catalog_ready_prod",
};

test("stable env writer accepts production Firebase + Algolia", () => {
  const { result, studioDir } = runWriter(prodFirebase);
  assert.equal(result.status, 0, result.stderr);
  const contents = readFileSync(path.join(studioDir, ".env.local"), "utf8");
  assert.match(contents, /VITE_FIREBASE_PROJECT_ID=fresh-prints-prod/);
  assert.match(contents, /VITE_ALGOLIA_INDEX_NAME=portal_catalog_ready_prod/);
  assert.match(contents, /VITE_ALGOLIA_APP_ID=Z1FVCM5QUX/);
  rmSync(studioDir, { recursive: true, force: true });
});

test("stable env writer rejects fresh-prints-dev project", () => {
  const { result, studioDir } = runWriter({
    ...prodFirebase,
    PROD_FIREBASE_PROJECT_ID: "fresh-prints-dev",
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /fresh-prints-prod|fresh-prints-dev/);
  rmSync(studioDir, { recursive: true, force: true });
});

test("stable env writer rejects portal_catalog_ready_dev", () => {
  const { result, studioDir } = runWriter({
    ...prodFirebase,
    PROD_ALGOLIA_INDEX_NAME: "portal_catalog_ready_dev",
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /portal_catalog_ready_prod|DEV Algolia/);
  rmSync(studioDir, { recursive: true, force: true });
});

test("stable env writer rejects wrong Algolia app id", () => {
  const { result, studioDir } = runWriter({
    ...prodFirebase,
    PROD_ALGOLIA_APP_ID: "WRONGAPPID",
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Z1FVCM5QUX/);
  rmSync(studioDir, { recursive: true, force: true });
});
