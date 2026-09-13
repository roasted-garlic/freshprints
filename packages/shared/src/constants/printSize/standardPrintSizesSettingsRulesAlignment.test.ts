import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../..");

test("standard print sizes settings are signed-in readable and server-written", async () => {
  const rules = await readFile(path.join(REPO_ROOT, "firestore.rules"), "utf8");
  assert.match(
    rules,
    /match \/settings\/standardPrintSizes\s*\{[\s\S]*?allow read: if isSignedIn\(\);\s*allow write: if false;/,
  );
});

test("printRequestItems allow optional standardSizePresetKey", async () => {
  const rules = await readFile(path.join(REPO_ROOT, "firestore.rules"), "utf8");
  assert.match(
    rules,
    /function printRequestItemRequiredFieldsValid\(data\)[\s\S]*?"standardSizePresetKey"/,
  );
  assert.match(
    rules,
    /function printRequestItemRequiredFieldsValid\(data\)[\s\S]*?isOptionalString\(data, "standardSizePresetKey"\)/,
  );
});
