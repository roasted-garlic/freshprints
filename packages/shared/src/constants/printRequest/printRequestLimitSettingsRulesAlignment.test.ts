import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../..");

test("print request limit settings are signed-in readable and server-written", async () => {
  const rules = await readFile(path.join(REPO_ROOT, "firestore.rules"), "utf8");
  assert.match(
    rules,
    /match \/settings\/printRequestLimits\s*\{[\s\S]*?allow read: if isSignedIn\(\);\s*allow write: if false;/,
  );
});

test("customers cannot create printRequestItems (callable / Admin only)", async () => {
  const rules = await readFile(path.join(REPO_ROOT, "firestore.rules"), "utf8");
  // Customer create must be denied; staff create may still be allowed.
  assert.match(
    rules,
    /match \/printRequestItems\/\{printRequestItemId\}[\s\S]*?allow create: if isStaff\(\)/,
  );
  assert.doesNotMatch(
    rules,
    /allow create: if[\s\S]{0,200}isCustomer\(\)[\s\S]{0,200}customerCanCreatePrintRequestItem/,
  );
});

test("customers cannot change quantity or delete printRequestItems (Admin callables)", async () => {
  const rules = await readFile(path.join(REPO_ROOT, "firestore.rules"), "utf8");
  assert.match(
    rules,
    /function customerCanUpdatePrintRequestItem\(\)[\s\S]*?request\.resource\.data\.quantity == resource\.data\.quantity/,
  );
  assert.match(
    rules,
    /allow delete: if isStaff\(\);\s*\/\/ Customer deletes go through Admin callables/,
  );
});

test("printRequestItems recognize immutable requestCountApplied Wave C marker", async () => {
  const rules = await readFile(path.join(REPO_ROOT, "firestore.rules"), "utf8");
  assert.match(
    rules,
    /function printRequestItemRequiredFieldsValid\(data\)[\s\S]*?"requestCountApplied"/,
  );
  assert.match(
    rules,
    /function printRequestItemRequiredFieldsValid\(data\)[\s\S]*?isOptionalBool\(data, "requestCountApplied"\)/,
  );
  assert.match(
    rules,
    /function customerCanUpdatePrintRequestItem\(\)[\s\S]*?optionalFieldUnchanged\("requestCountApplied"\)/,
  );
  assert.match(
    rules,
    /match \/printRequestItems\/\{printRequestItemId\}[\s\S]*?allow update: if isStaff\(\)[\s\S]*?optionalFieldUnchanged\("requestCountApplied"\)/,
  );
});

test("printRequestItems allow optional interactive artwork enhance fields", async () => {
  const rules = await readFile(path.join(REPO_ROOT, "firestore.rules"), "utf8");
  assert.match(
    rules,
    /function printRequestItemRequiredFieldsValid\(data\)[\s\S]*?"artworkEnhanceMode"/,
  );
  assert.match(
    rules,
    /function printRequestItemRequiredFieldsValid\(data\)[\s\S]*?isOptionalArtworkEnhanceMode\(data, "artworkEnhanceMode"\)/,
  );
  assert.match(
    rules,
    /function customerCanUpdatePrintRequestItem\(\)[\s\S]*?optionalFieldUnchanged\("artworkEnhanceMode"\)/,
  );
  assert.match(
    rules,
    /match \/printRequestItems\/\{printRequestItemId\}[\s\S]*?allow update: if isStaff\(\)[\s\S]*?optionalFieldUnchanged\("artworkEnhanceMode"\)/,
  );
});

test("printRequestItems tolerate legacy callable updatedBy field on items", async () => {
  const rules = await readFile(path.join(REPO_ROOT, "firestore.rules"), "utf8");
  assert.match(
    rules,
    /function printRequestItemRequiredFieldsValid\(data\)[\s\S]*?"updatedBy"/,
  );
  assert.match(
    rules,
    /function printRequestItemRequiredFieldsValid\(data\)[\s\S]*?isOptionalString\(data, "updatedBy"\)/,
  );
  assert.match(
    rules,
    /match \/printRequestItems\/\{printRequestItemId\}[\s\S]*?allow update: if isStaff\(\)[\s\S]*?optionalFieldUnchanged\("updatedBy"\)/,
  );
});
