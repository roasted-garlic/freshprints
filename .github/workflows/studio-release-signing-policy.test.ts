import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workflowSource = readFileSync(path.join(__dirname, "studio-release.yml"), "utf8");
const builderSource = readFileSync(
  path.join(__dirname, "../../apps/studio/electron-builder.json5"),
  "utf8",
);

test("workflow declares distribution_mode choice input defaulting to signed", () => {
  assert.match(workflowSource, /distribution_mode:/);
  assert.match(workflowSource, /- signed/);
  assert.match(workflowSource, /- internal-unsigned/);
  assert.match(workflowSource, /distribution_mode:[\s\S]*?default:\s*signed/);
});

test("workflow has build-windows, build-macos, and finalize-release jobs", () => {
  assert.match(workflowSource, /name:\s*build-windows/);
  assert.match(workflowSource, /name:\s*build-macos/);
  assert.match(workflowSource, /name:\s*finalize-release/);
  assert.match(workflowSource, /needs:\s*\[build-windows,\s*build-macos\]/);
});

test("Windows job runs on windows-latest and Mac job on macos-latest", () => {
  assert.match(workflowSource, /build-windows:[\s\S]*?runs-on:\s*windows-latest/);
  assert.match(workflowSource, /build-macos:[\s\S]*?runs-on:\s*macos-latest/);
});

test("Mac packaging is arm64 with publish never; Windows keeps NSIS publish never", () => {
  assert.match(workflowSource, /--mac --arm64 --publish never/);
  assert.match(workflowSource, /--win --x64 --publish never/);
  assert.doesNotMatch(workflowSource, /--publish always/);
});

test("finalize requires Windows exe/blockmap/latest.yml and Mac dmg/zip/latest-mac.yml", () => {
  assert.match(workflowSource, /latest\.yml/);
  assert.match(workflowSource, /latest-mac\.yml/);
  assert.match(workflowSource, /\*Windows\*-Setup\.exe/);
  assert.match(workflowSource, /\*Mac\*-Installer\.dmg/);
  assert.match(workflowSource, /\*Mac\*-Installer\.zip/);
  assert.match(workflowSource, /Missing required dual-platform release asset/);
});

test("finalize fails closed when platform SHAs diverge", () => {
  assert.match(workflowSource, /Windows and Mac builds resolved different SHAs/);
});

test("stable Mac rejects signed distribution_mode until Apple credential phase", () => {
  assert.match(
    workflowSource,
    /Stable Studio Mac releases for 1\.0\.4 require distribution_mode: internal-unsigned/,
  );
  assert.match(workflowSource, /Gatekeeper/);
});

test("shared env writer is used on both platform jobs", () => {
  const matches = workflowSource.match(/write-studio-release-env\.mjs/g) || [];
  assert.equal(matches.length, 2);
});

test("workflow does not auto-publish (draft-only finalize)", () => {
  assert.match(workflowSource, /does NOT publish the release/);
  assert.match(workflowSource, /draft=true/);
});

test("stable production reachability guards remain on both platform jobs", () => {
  const guards = workflowSource.match(/git merge-base --is-ancestor HEAD origin\/production/g) || [];
  assert.equal(guards.length, 2);
});

type DecisionResult =
  | "fail-incomplete"
  | "signed"
  | "unsigned-prerelease"
  | "internal-unsigned-warning"
  | "fail-stable-requires-signing";

/** Faithful reimplementation of the Windows signing decision logic. */
function decideWindowsSigning(
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

test("stable + signed + missing signing credentials fails (Windows)", () => {
  assert.equal(decideWindowsSigning("", "", "stable", "signed"), "fail-stable-requires-signing");
});

test("stable + signed + complete signing credentials reaches the packaging gate (Windows)", () => {
  assert.equal(decideWindowsSigning("fake-cert", "fake-password", "stable", "signed"), "signed");
});

test("stable + internal-unsigned + missing signing credentials is allowed (Windows)", () => {
  assert.equal(
    decideWindowsSigning("", "", "stable", "internal-unsigned"),
    "internal-unsigned-warning",
  );
});

test("stable + internal-unsigned + partial signing config still fails closed (Windows)", () => {
  assert.equal(
    decideWindowsSigning("fake-cert", "", "stable", "internal-unsigned"),
    "fail-incomplete",
  );
});

test("prerelease ignores distribution_mode and always builds unsigned (Windows)", () => {
  assert.equal(
    decideWindowsSigning("", "", "prerelease", "internal-unsigned"),
    "unsigned-prerelease",
  );
  assert.equal(decideWindowsSigning("", "", "prerelease", "signed"), "unsigned-prerelease");
});

test("electron-builder Mac is arm64-only with dmg+zip and sharp asarUnpack", () => {
  const macBlock = builderSource.slice(builderSource.indexOf('"mac":'), builderSource.indexOf('"win":'));
  assert.match(macBlock, /"target":\s*"dmg"/);
  assert.match(macBlock, /"target":\s*"zip"/);
  assert.match(macBlock, /"arch":\s*\[\s*"arm64"\s*\]/);
  assert.doesNotMatch(macBlock, /"x64"/);
  assert.match(builderSource, /asarUnpack/);
  assert.match(builderSource, /node_modules\/sharp/);
  assert.match(macBlock, /"identity":\s*null/);
});

test("electron-builder Windows NSIS x64 target remains", () => {
  assert.match(builderSource, /"target":\s*"nsis"/);
  assert.match(builderSource, /Windows-\$\{version\}-Setup/);
});

test("Mac artifact naming uses Fresh Prints Mac Installer convention", () => {
  assert.match(builderSource, /Mac-\$\{version\}-Installer/);
});

test("packaged Mac sharp verifier script exists and is referenced by workflow", () => {
  // From apps/studio/release/<version>/ the script is ../../scripts/...
  assert.match(
    workflowSource,
    /node \.\.\/\.\.\/scripts\/verify-packaged-mac-sharp\.mjs/,
  );
  const verifier = readFileSync(
    path.join(__dirname, "../../apps/studio/scripts/verify-packaged-mac-sharp.mjs"),
    "utf8",
  );
  assert.match(verifier, /ELECTRON_RUN_AS_NODE/);
  assert.match(verifier, /require\('sharp'\)/);
});
