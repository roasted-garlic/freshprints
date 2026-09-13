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

test("customer printRequestQuotaOverride is allowlisted and client-immutable", async () => {
  const rules = await readFile(path.join(REPO_ROOT, "firestore.rules"), "utf8");
  assert.match(
    rules,
    /function customerRequiredFieldsValid\(data\)[\s\S]*?"printRequestQuotaOverride"/,
  );
  assert.match(
    rules,
    /function customerRequiredFieldsValid\(data\)[\s\S]*?\(!\("printRequestQuotaOverride" in data\) \|\| data\.printRequestQuotaOverride is map\)/,
  );
  assert.match(
    rules,
    /match \/customers\/\{customerId\}[\s\S]*?allow update: if isStaff\(\)[\s\S]*?optionalFieldUnchanged\("printRequestQuotaOverride"\)/,
  );
  assert.match(
    rules,
    /match \/customers\/\{customerId\}[\s\S]*?allow create: if isStaff\(\)[\s\S]*?!\("printRequestQuotaOverride" in request\.resource\.data\)/,
  );
  const customersBlock = rules.match(/match \/customers\/\{customerId\}[\s\S]*?match \/customerUsernames/)?.[0];
  assert.ok(customersBlock, "customers rules block expected");
  assert.match(
    customersBlock,
    /isCustomer\(\)[\s\S]*?affectedKeys\(\)\s*\.hasOnly\(\[[\s\S]*?assistedProofEmailOptIn[\s\S]*?updatedAt[\s\S]*?\]\)/,
  );
  assert.doesNotMatch(
    customersBlock,
    /isCustomer\(\)[\s\S]*?affectedKeys\(\)\s*\.hasOnly\(\[[\s\S]*?printRequestQuotaOverride/,
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
  const customerUpdate = rules.match(
    /function customerPrintRequestItemPortalEditableUpdate\(\)[\s\S]*?\n    \}/,
  )?.[0];
  assert.ok(customerUpdate, "customerPrintRequestItemPortalEditableUpdate expected");
  assert.match(
    customerUpdate,
    /affectedKeys\(\)\s*\.hasOnly\(\[[\s\S]*?"printWidthInches"[\s\S]*?"updatedAt"[\s\S]*?\]\)/,
  );
  assert.doesNotMatch(customerUpdate, /"quantity"/);
  assert.match(
    rules,
    /allow delete: if isStaff\(\);\s*\/\/ Customer deletes go through Admin callables/,
  );
});

test("printRequestItems recognize immutable requestCountApplied Wave C marker", async () => {
  const rules = await readFile(path.join(REPO_ROOT, "firestore.rules"), "utf8");
  assert.match(
    rules,
    /function printRequestItemKeysAllowed\(data\)[\s\S]*?"requestCountApplied"/,
  );
  assert.match(
    rules,
    /function printRequestItemRequiredFieldsValid\(data\)[\s\S]*?isOptionalBool\(data, "requestCountApplied"\)/,
  );
  const customerUpdate = rules.match(
    /function customerPrintRequestItemPortalEditableUpdate\(\)[\s\S]*?\n    \}/,
  )?.[0];
  assert.ok(customerUpdate, "customerPrintRequestItemPortalEditableUpdate expected");
  assert.doesNotMatch(customerUpdate, /"requestCountApplied"/);
  assert.match(
    rules,
    /match \/printRequestItems\/\{printRequestItemId\}[\s\S]*?allow update: if isStaff\(\)[\s\S]*?optionalFieldUnchanged\("requestCountApplied"\)/,
  );
});

test("printRequestItems allow optional interactive artwork enhance fields", async () => {
  const rules = await readFile(path.join(REPO_ROOT, "firestore.rules"), "utf8");
  assert.match(
    rules,
    /function printRequestItemKeysAllowed\(data\)[\s\S]*?"artworkEnhanceMode"/,
  );
  assert.match(
    rules,
    /function printRequestItemRequiredFieldsValid\(data\)[\s\S]*?isOptionalArtworkEnhanceMode\(data, "artworkEnhanceMode"\)/,
  );
  const customerUpdate = rules.match(
    /function customerPrintRequestItemPortalEditableUpdate\(\)[\s\S]*?\n    \}/,
  )?.[0];
  assert.ok(customerUpdate, "customerPrintRequestItemPortalEditableUpdate expected");
  assert.doesNotMatch(customerUpdate, /"artworkEnhanceMode"/);
  assert.doesNotMatch(customerUpdate, /"preEnhancePrintWidthInches"/);
  assert.doesNotMatch(customerUpdate, /"preEnhancePrintHeightInches"/);
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
