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

test("Mac packaging builds arm64 and x64 with publish never; Windows keeps NSIS publish never", () => {
  assert.match(workflowSource, /for ARCH in arm64 x64/);
  assert.match(workflowSource, /electron-builder --mac "--\$\{ARCH\}" --publish never/);
  assert.match(workflowSource, /electron-builder --win --x64 --publish never/);
  assert.doesNotMatch(workflowSource, /--publish always/);
});

test("Windows packaging retries electron-builder after flaky nsis-resources downloads", () => {
  assert.match(workflowSource, /nsis-resources-3\.4\.1/);
  assert.match(workflowSource, /electron-builder Windows attempt/);
  assert.match(workflowSource, /\$maxAttempts = 3/);
  assert.match(workflowSource, /curl\.exe -fsSL --retry 8/);
});


test("finalize requires Windows + Mac x64 + Mac arm64 canonical assets", () => {
  assert.match(workflowSource, /Fresh-Prints-Windows-\$\{VERSION\}-Setup\.exe/);
  assert.match(workflowSource, /Fresh-Prints-Mac-arm64-\$\{VERSION\}-Installer\.dmg/);
  assert.match(workflowSource, /Fresh-Prints-Mac-arm64-\$\{VERSION\}-Installer\.zip/);
  assert.match(workflowSource, /Fresh-Prints-Mac-x64-\$\{VERSION\}-Installer\.dmg/);
  assert.match(workflowSource, /Fresh-Prints-Mac-x64-\$\{VERSION\}-Installer\.zip/);
  assert.match(workflowSource, /latest\.yml/);
  assert.match(workflowSource, /latest-mac\.yml/);
});

test("finalize naming regression: rejects spaced and Fresh.Prints dotted names", () => {
  assert.match(workflowSource, /Fresh\.Prints-\*/);
  assert.match(workflowSource, /Asset name contains spaces/);
  assert.match(workflowSource, /must not contain spaces/);
  assert.match(builderSource, /Fresh-Prints-Windows-\$\{version\}-Setup/);
  assert.match(builderSource, /Fresh-Prints-Mac-\$\{arch\}-\$\{version\}-Installer/);
  assert.doesNotMatch(builderSource, /\$\{productName\}-Windows/);
  assert.doesNotMatch(builderSource, /\$\{productName\}-Mac/);
});

test("finalize fails closed when platform SHAs diverge", () => {
  assert.match(workflowSource, /Windows and Mac builds resolved different SHAs/);
});

test("non-stable finalize is validation-only and cannot mutate GitHub Releases", () => {
  assert.match(workflowSource, /VALIDATION_ONLY: release_type=/);
  assert.match(workflowSource, /VALIDATION_ONLY_NO_RELEASE_MUTATION=1/);
  // Mutation path must be gated behind stable.
  const mutateIdx = workflowSource.indexOf('gh api --method POST "repos/${{ github.repository }}/releases"');
  const validationIdx = workflowSource.indexOf("VALIDATION_ONLY_NO_RELEASE_MUTATION=1");
  assert.ok(mutateIdx > 0 && validationIdx > 0);
  assert.ok(validationIdx < mutateIdx, "validation gate must precede release POST");
  assert.match(workflowSource, /if \[ "\$RELEASE_TYPE" != "stable" \]/);
});

test("stable finalize additionally requires BUILD_SHA on production", () => {
  assert.match(
    workflowSource,
    /Stable finalize requires BUILD_SHA to be reachable from origin\/production/,
  );
});

test("stable finalize uploads assets by release id, not ambiguous shared tag", () => {
  assert.match(workflowSource, /upload_url/);
  assert.match(workflowSource, /Uploading \$\{name\} -> release_id=/);
  assert.match(workflowSource, /UPLOAD_URL\}\?name=\$\{name\}/);
  assert.match(workflowSource, /NEVER by ambiguous shared tag_name/);
  assert.doesNotMatch(workflowSource, /^\s*gh release upload\b/m);
  assert.match(workflowSource, /Tag \$\{TAG\} or release name \$\{VERSION\} already used by release/);
  assert.match(workflowSource, /GitHub assigned temporary tag \$\{UPLOAD_TAG\}/);
  assert.match(workflowSource, /Failed to normalize draft tag from/);
});

test("stable Mac rejects signed distribution_mode until Apple credential phase (A2 gated)", () => {
  assert.match(
    workflowSource,
    /Stable Studio Mac releases for 1\.0\.9 still require distribution_mode: internal-unsigned until Apple Developer ID secrets \(MAC_CSC_LINK \+ MAC_CSC_KEY_PASSWORD\)/,
  );
  assert.match(workflowSource, /Gatekeeper/);
});

test("finalize expects Studio package version 1.0.9", () => {
  assert.match(workflowSource, /Expected Studio version 1\.0\.9/);
});

test("shared env writer is used on both platform jobs", () => {
  const matches = workflowSource.match(/write-studio-release-env\.mjs/g) || [];
  assert.equal(matches.length, 2);
});

test("workflow does not auto-publish (draft-only finalize)", () => {
  assert.match(workflowSource, /does NOT publish the release/);
  assert.match(workflowSource, /draft=true/);
  assert.match(workflowSource, /studio-github-release-copy\.mjs draft/);
  assert.doesNotMatch(workflowSource, /make_latest/);
  assert.doesNotMatch(workflowSource, /publish-studio-stable-github-release/);
});

test("stable production reachability guards remain on both platform jobs", () => {
  const guards = workflowSource.match(/git merge-base --is-ancestor HEAD origin\/production/g) || [];
  assert.equal(guards.length, 2);
});

test("Mac Big Sur floor is pinned and must not rise above 11.x in packaging gate", () => {
  assert.match(builderSource, /"minimumSystemVersion":\s*"11\.0"/);
  assert.match(workflowSource, /minimumSystemVersion .* is above Big Sur/);
});

test("packaged Mac sharp verifier proves each arch independently", () => {
  assert.match(workflowSource, /verify-packaged-mac-sharp\.mjs "\$APP_PATH" "\$ARCH"/);
  assert.match(workflowSource, /prepare-sharp-for-darwin-arch\.mjs/);
  assert.match(workflowSource, /merge-latest-mac-yml\.mjs/);
});

test("Mac packaging fails closed on codesign --strict --deep for each arch", () => {
  assert.match(workflowSource, /verify-packaged-mac-codesign\.mjs "\$APP_PATH" adhoc/);
  assert.match(workflowSource, /Structural codesign integrity/);
  assert.match(workflowSource, /Do NOT clear quarantine as the product fix/);
});

test("electron-builder Mac uses ad-hoc identity with hardenedRuntime false", () => {
  const macBlock = builderSource.slice(builderSource.indexOf('"mac":'), builderSource.indexOf('"win":'));
  assert.match(macBlock, /"identity":\s*"-"/);
  assert.match(macBlock, /"hardenedRuntime":\s*false/);
  assert.match(macBlock, /"gatekeeperAssess":\s*false/);
  assert.doesNotMatch(macBlock, /"identity":\s*null/);
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
  assert.equal(decideWindowsSigning("link", "pw", "stable", "signed"), "signed");
});

test("stable + internal-unsigned + missing signing credentials is allowed (Windows)", () => {
  assert.equal(
    decideWindowsSigning("", "", "stable", "internal-unsigned"),
    "internal-unsigned-warning",
  );
});

test("stable + internal-unsigned + partial signing config still fails closed (Windows)", () => {
  assert.equal(
    decideWindowsSigning("link-only", "", "stable", "internal-unsigned"),
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

test("electron-builder Mac is x64+arm64 with dmg+zip and sharp asarUnpack", () => {
  const macBlock = builderSource.slice(builderSource.indexOf('"mac":'), builderSource.indexOf('"win":'));
  assert.match(macBlock, /"target":\s*"dmg"/);
  assert.match(macBlock, /"target":\s*"zip"/);
  assert.match(macBlock, /"arch":\s*\[[\s\S]*"x64"[\s\S]*"arm64"/);
  assert.match(builderSource, /asarUnpack/);
  assert.match(builderSource, /node_modules\/sharp/);
  assert.match(macBlock, /"identity":\s*"-"/);
});

test("electron-builder Windows NSIS x64 target remains", () => {
  assert.match(builderSource, /"target":\s*"nsis"/);
  assert.match(builderSource, /Fresh-Prints-Windows-\$\{version\}-Setup/);
});
