import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");

test("email provider settings are owner-readable and server-written", async () => {
  const rules = await readFile(path.join(REPO_ROOT, "firestore.rules"), "utf8");
  assert.match(
    rules,
    /match \/settings\/emailProviders\s*\{\s*allow read: if isOwner\(\);\s*allow write: if false;/,
  );
});

test("email delivery jobs deny every client", async () => {
  const rules = await readFile(path.join(REPO_ROOT, "firestore.rules"), "utf8");
  assert.match(
    rules,
    /match \/emailDeliveryJobs\/\{jobId\}\s*\{\s*allow read, write: if false;/,
  );
});
