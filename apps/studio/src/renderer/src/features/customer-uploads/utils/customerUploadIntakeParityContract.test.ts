import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const intake = fs.readFileSync(path.join(root, "components/CustomerUploadIntakeSection.tsx"), "utf8");
const hook = fs.readFileSync(path.join(root, "hooks/useCustomerUploadIntake.ts"), "utf8");
const donationPage = fs.readFileSync(path.join(root, "pages/DonatedDesignsPage.tsx"), "utf8");
const uploadPage = fs.readFileSync(path.join(root, "pages/CustomerUploadsPage.tsx"), "utf8");

test("both intake routes use one shared renderer with confirmed purpose scopes", () => {
  assert.match(donationPage, /purposeScope="catalog_donation"/);
  assert.match(uploadPage, /purposeScope="print_request"/);
  assert.match(donationPage, /<CustomerUploadIntakeSection/);
  assert.match(uploadPage, /<CustomerUploadIntakeSection/);
});

test("pending shared actions remain promote, exclude, and owner-admin delete", () => {
  assert.match(intake, /Send to AI Review/);
  assert.match(intake, /Do not add to catalog/);
  assert.match(intake, /label: "Delete Upload"/);
  assert.match(intake, /intake\.canDeleteEligible/);
});

test("excluded shared actions are visible restore plus owner-admin delete", () => {
  assert.match(intake, /catalogReviewStatus === "excluded_from_catalog"[\s\S]*?Restore to Pending/);
  assert.match(intake, /label: "Delete Upload"/);
});

test("catalog-ineligible records are outside Pending and Excluded queries", () => {
  assert.match(hook, /where\("catalogReviewStatus", "==", filter\)/);
  assert.match(hook, /"pending_staff_review"/);
  assert.match(hook, /"excluded_from_catalog"/);
  assert.doesNotMatch(intake, /catalogReviewStatus === "not_eligible"/);
});

test("selection, tab, and route changes cannot retain stale detail modal state", () => {
  assert.match(intake, /key={`\$\{intake\.filter}:\$\{intake\.selected\.id}`}/);
  assert.match(intake, /setIsRestoreOpen\(false\)/);
});
