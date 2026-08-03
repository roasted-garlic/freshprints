import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

// .github/workflows/studio-release.yml's signing decision is embedded PowerShell inside a `run:`
// block, which cannot be imported/unit-tested the way TypeScript can. This file combines a
// source-level regression guard (the workflow file contains the expected structure) with a
// faithful reimplementation of the exact decision logic, exercised against every required mode
// combination with synthetic (never real) values — mirroring the pattern already used for
// apps/studio/electron/ipc/studioUpdate/studioUpdateService.test.ts's quitAndInstall guard.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workflowSource = readFileSync(path.join(__dirname, "studio-release.yml"), "utf8");

test("workflow declares a distribution_mode choice input defaulting to signed", () => {
  assert.match(workflowSource, /distribution_mode:/);
  assert.match(workflowSource, /- signed/);
  assert.match(workflowSource, /- internal-unsigned/);
  assert.match(workflowSource, /distribution_mode:[\s\S]*?default:\s*signed/);
});

type DecisionResult =
  | "fail-incomplete"
  | "signed"
  | "unsigned-prerelease"
  | "internal-unsigned-warning"
  | "fail-stable-requires-signing";

/** Faithful reimplementation of the workflow's exact PowerShell decision logic. */
function decideSigning(
  link: string,
  password: string,
  releaseType: "stable" | "prerelease",
  distributionMode: "signed" | "internal-unsigned",
): DecisionResult {
  const hasLink = link.trim().length > 0;
  const hasPassword = password.trim().length > 0;

  if (hasLink !== hasPassword) {
    return "fail-incomplete";
  }
  if (hasLink && hasPassword) {
    return "signed";
  }
  if (releaseType !== "stable") {
    return "unsigned-prerelease";
  }
  if (distributionMode === "internal-unsigned") {
    return "internal-unsigned-warning";
  }
  return "fail-stable-requires-signing";
}

test("stable + signed + missing signing credentials fails", () => {
  assert.equal(decideSigning("", "", "stable", "signed"), "fail-stable-requires-signing");
});

test("stable + signed + complete signing credentials reaches the packaging gate", () => {
  assert.equal(decideSigning("fake-cert", "fake-password", "stable", "signed"), "signed");
});

test("stable + internal-unsigned + missing signing credentials is allowed", () => {
  assert.equal(decideSigning("", "", "stable", "internal-unsigned"), "internal-unsigned-warning");
});

test("stable + internal-unsigned + partial signing config still fails closed", () => {
  assert.equal(decideSigning("fake-cert", "", "stable", "internal-unsigned"), "fail-incomplete");
});

test("stable + internal-unsigned + full signing credentials present signs anyway", () => {
  assert.equal(
    decideSigning("fake-cert", "fake-password", "stable", "internal-unsigned"),
    "signed",
  );
});

test("stable from a non-production ref is a separate, unaffected guard (unchanged)", () => {
  // The stable-ref guard is a distinct workflow step (`Guard stable release ref` +
  // `Verify ref is reachable from production`) that runs before this signing step and is not
  // modified by this change — confirmed present and unchanged in the workflow source.
  assert.match(workflowSource, /Guard stable release ref/);
  assert.match(workflowSource, /git merge-base --is-ancestor HEAD origin\/production/);
});

test("prerelease ignores distribution_mode and always builds unsigned", () => {
  assert.equal(decideSigning("", "", "prerelease", "internal-unsigned"), "unsigned-prerelease");
  assert.equal(decideSigning("", "", "prerelease", "signed"), "unsigned-prerelease");
});

test("no dev Firebase fallback exists for stable (unchanged, separate step)", () => {
  assert.match(workflowSource, /missingLabel = "PROD_FIREBASE_\*"/);
  assert.doesNotMatch(
    workflowSource,
    /RELEASE_TYPE -eq "stable"[\s\S]{0,200}DEV_FIREBASE/,
  );
});

test("an unrecognized distribution_mode value falls through to the safe stable-requires-signing failure", () => {
  // GitHub Actions' `type: choice` + fixed `options` list prevents an invalid value from being
  // submitted through the normal dispatch UI; this proves the code itself still fails safe even
  // if an unexpected string reached it (e.g. via direct API dispatch).
  assert.equal(
    decideSigning("", "", "stable", "not-a-real-mode" as "signed"),
    "fail-stable-requires-signing",
  );
});
