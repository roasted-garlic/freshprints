import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { buildTransitionRules } from "./generate-firestore-transition-rules.mjs";

const finalRules = `rules_version = '2';
    // FINAL STATE: customer reads use portalPrintRequestItems only after the additive transition
    // has completed population/verification. Canonical printRequestItems remain staff-only.
    match /printRequestItems/{printRequestItemId} {
      allow read: if isStaff();
      allow create: if false;
    }
    match /portalPrintRequestItems/{itemId} {
      allow read: if isStaff() || isCustomer();
      allow create, update, delete: if false;
    }
`;

test("generates transition rules with only the canonical customer-read widening", () => {
  const transition = buildTransitionRules(finalRules);
  assert.match(transition, /TRANSITION STATE/);
  assert.match(transition, /customerOwnsPrintRequestById\(resource\.data\.printRequestId\)/);
  assert.match(transition, /allow create, update, delete: if false/);
  assert.doesNotMatch(transition, /allow read: if isCustomer\(\);/);
});

test("rejects an already-transition rules input", () => {
  assert.throws(() => buildTransitionRules("TRANSITION STATE"), /expected final printRequestItems boundary/);
});

test("checked-in transition artifact is generated from final rules and changes only the boundary", () => {
  const finalRules = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
  const transitionRules = readFileSync(new URL("../firestore.transition.rules", import.meta.url), "utf8");
  assert.equal(buildTransitionRules(finalRules), transitionRules);
  assert.match(finalRules, /FINAL STATE:[\s\S]*match \/printRequestItems\/\{printRequestItemId\} \{[\s\S]*allow read: if isStaff\(\);/);
  assert.match(finalRules, /match \/portalPrintRequestItems\/\{itemId\} \{[\s\S]*allow read: if isStaff\(\)/);
  assert.match(transitionRules, /TRANSITION STATE/);
  assert.match(transitionRules, /allow read: if isStaff\(\)[\s\S]*customerOwnsPrintRequestById/);
});
