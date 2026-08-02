import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const deletion = fs.readFileSync(path.join(root, "components/CustomerUploadDeletionDialog.tsx"), "utf8");
const exclusion = fs.readFileSync(path.join(root, "components/CustomerUploadExclusionDialog.tsx"), "utf8");
const intake = fs.readFileSync(path.join(root, "components/CustomerUploadIntakeSection.tsx"), "utf8");
const hook = fs.readFileSync(path.join(root, "hooks/useCustomerUploadIntake.ts"), "utf8");
const focus = fs.readFileSync(
  path.resolve(root, "../../shared/hooks/useModalFocusContainment.ts"),
  "utf8",
);

test("Delete Upload opens an in-app modal and never calls native dialogs", () => {
  assert.match(intake, /<CustomerUploadDeletionDialog/);
  assert.match(deletion, /<h2 id="customer-upload-delete-title">Delete Upload\?<\/h2>/);
  assert.doesNotMatch(`${intake}\n${hook}\n${deletion}`, /window\.(?:prompt|confirm|alert)\s*\(/);
});

test("delete preview gates one explicit destructive confirmation", () => {
  assert.match(deletion, /customerUploadDeletionService[\s\S]*?\.preview\(uploadId\)/);
  assert.match(deletion, /preview\?\.outcome === "allowed_hard_delete"/);
  assert.match(deletion, /if \(!canDelete\)/);
  assert.match(deletion, /customerUploadDeletionService\.deleteEligible\([\s\S]*?uploadId/);
  assert.match(deletion, /customerUploadDeletionService\.confirmationPhrase/);
  assert.match(deletion, /isSubmitting \? "Deleting…" : "Delete Upload"/);
});

test("blocked, missing/already-done, and failed preview states are user-safe", () => {
  assert.match(deletion, /preview\?\.outcome === "blocked"/);
  assert.match(deletion, /preview\.blockers\.map/);
  assert.match(deletion, /preview\?\.outcome === "already_done"/);
  assert.match(deletion, /Unable to determine whether this upload can be deleted/);
  assert.doesNotMatch(deletion, /Firestore path|Storage path|stack trace/);
});

test("cancel and Escape close without mutation and focus is contained", () => {
  const cancelButton = deletion.match(/<button[\s\S]*?ref={cancelRef}[\s\S]*?<\/button>/)?.[0] ?? "";
  assert.match(cancelButton, /onClick={safeCancel}/);
  assert.doesNotMatch(cancelButton, /deleteEligible|onCompleted/);
  assert.match(deletion, /useModalFocusContainment/);
  assert.match(focus, /event\.key === "Escape"/);
  assert.match(focus, /event\.key !== "Tab"/);
  assert.match(focus, /initialFocusRef\.current\?\.focus\(\)/);
});

test("dialog target and completion use the current selected row identity", () => {
  assert.match(intake, /uploadId={row\.id}/);
  assert.match(intake, /intake\.deleteCompleted\(row\.id, message\)/);
  assert.match(intake, /key={`\$\{intake\.filter}:\$\{intake\.selected\.id}`}/);
});

test("exclusion uses an in-app reversible lifecycle confirmation", () => {
  assert.match(intake, /<CustomerUploadExclusionDialog/);
  assert.match(exclusion, /Do not add to catalog\?/);
  assert.match(exclusion, /stored artwork, request items,[\s\S]*technical processing state remain unchanged/);
  assert.match(intake, /await intake\.exclude\(row\.id\)/);
  assert.doesNotMatch(exclusion, /deleteEligible|\.delete\(/);
});
