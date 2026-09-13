#!/usr/bin/env node
/* eslint-env node */
/**
 * Generate the byte-stable transition Firestore Rules artifact from final firestore.rules.
 *
 * The transition keeps the final ruleset intact except for the intentional customer read
 * predicate on printRequestItems. It is deployable with `firebase deploy --only firestore:rules`
 * after the generated file is selected by firebase.json, but this generator itself never deploys.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = resolve(scriptPath, "..", "..");
const finalRulesPath = resolve(repoRoot, "firestore.rules");
const defaultOutputPath = resolve(repoRoot, "firestore.transition.rules");

export const TRANSITION_RULES_GENERATOR_VERSION = "1";
export const TRANSITION_RULES_OUTPUT = "firestore.transition.rules";

export function buildTransitionRules(finalRules) {
  const finalMarker =
    "    // FINAL STATE: customer reads use portalPrintRequestItems only after the additive transition\n" +
    "    // has completed population/verification. Canonical printRequestItems remain staff-only.\n" +
    "    match /printRequestItems/{printRequestItemId} {\n" +
    "      allow read: if isStaff();";
  const transitionMarker =
    "    // TRANSITION STATE: customer canonical reads remain available while projections converge.\n" +
    "    // Projection writes remain Admin-only; generate this artifact from final firestore.rules.\n" +
    "    match /printRequestItems/{printRequestItemId} {\n" +
    "      allow read: if isStaff()\n" +
    "        || (isCustomer() && customerOwnsPrintRequestById(resource.data.printRequestId));";

  if (typeof finalRules !== "string" || !finalRules.includes(finalMarker)) {
    throw new Error("firestore.rules does not contain the expected final printRequestItems boundary.");
  }
  if (finalRules.includes("TRANSITION STATE")) {
    throw new Error("firestore.rules must remain the final state; transition input is not accepted.");
  }
  return finalRules.replace(finalMarker, transitionMarker);
}

export function generateTransitionRules(outputPath = defaultOutputPath) {
  const transitionRules = buildTransitionRules(readFileSync(finalRulesPath, "utf8"));
  writeFileSync(outputPath, transitionRules, "utf8");
  return { outputPath, bytes: Buffer.byteLength(transitionRules, "utf8") };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(scriptPath)) {
  const outputArg = process.argv[2] ? resolve(process.cwd(), process.argv[2]) : defaultOutputPath;
  const result = generateTransitionRules(outputArg);
  console.log(JSON.stringify({ generatorVersion: TRANSITION_RULES_GENERATOR_VERSION, ...result }));
}
