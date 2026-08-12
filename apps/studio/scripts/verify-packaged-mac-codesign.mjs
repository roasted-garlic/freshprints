#!/usr/bin/env node
/**
 * Fail closed if a packaged Mac .app does not pass strict codesign verification.
 * Used by studio-release.yml after each arch package (arm64 + x64).
 *
 * Asserts:
 * - codesign --verify --verbose=4 --strict --deep exits 0
 * - Contents/_CodeSignature/CodeResources exists
 * - codesign -d shows an ad-hoc signature (not Developer ID) for internal builds
 *
 * Never prints secrets. Requires macOS (codesign).
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const appPath = process.argv[2];
const expectedMode = process.argv[3] || "adhoc"; // adhoc | any

if (!appPath) {
  console.error("Usage: verify-packaged-mac-codesign.mjs <path-to.app> [adhoc|any]");
  process.exit(2);
}

if (process.platform !== "darwin") {
  console.error("verify-packaged-mac-codesign.mjs requires macOS");
  process.exit(2);
}

if (!fs.existsSync(appPath) || !appPath.endsWith(".app")) {
  console.error(`Missing or invalid .app path: ${appPath}`);
  process.exit(1);
}

const codeResources = path.join(appPath, "Contents", "_CodeSignature", "CodeResources");
if (!fs.existsSync(codeResources)) {
  console.error(`Missing sealed CodeResources at ${codeResources}`);
  process.exit(1);
}
console.log(`PACKAGED_CODERESOURCES_OK=${codeResources}`);

function runCodesign(args) {
  const result = spawnSync("codesign", args, {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
  // codesign often writes informational output to stderr even on success.
  const combined = `${result.stdout || ""}${result.stderr || ""}`;
  return { status: result.status ?? 1, output: combined, error: result.error };
}

const verify = runCodesign(["-v", "-vvv", "--strict", "--deep", appPath]);
if (verify.status !== 0) {
  console.error("codesign --strict --deep failed:");
  console.error(verify.output || verify.error);
  process.exit(1);
}
console.log("PACKAGED_CODESIGN_VERIFY_OK=1");

const display = runCodesign(["-d", "-vvv", appPath]);
if (display.status !== 0 && !display.output) {
  console.error("codesign -d -vvv failed to produce display output");
  console.error(display.error || "");
  process.exit(1);
}

const text = display.output;
const interesting = text.split(/\r?\n/).filter((line) =>
  /Authority|TeamIdentifier|Signature|Identifier|Format|Flags|CodeDirectory|Runtime Version|flags=/i.test(
    line,
  ),
);
for (const line of interesting.slice(0, 40)) {
  console.log(`CODESIGN_DISPLAY: ${line}`);
}

const lower = text.toLowerCase();
const looksAdhoc =
  lower.includes("signature=adhoc") ||
  lower.includes("authority=adhoc") ||
  /\bflags=[^\n]*adhoc/i.test(text) ||
  /\(adhoc\)/i.test(text) ||
  /flags=0x[0-9a-f]*2\b/i.test(text);

const looksDeveloperId = /developer id application:/i.test(text);

if (expectedMode === "adhoc") {
  if (looksDeveloperId) {
    console.error("Expected ad-hoc internal signature but Developer ID authority was present");
    process.exit(1);
  }
  if (!looksAdhoc) {
    console.error(
      "Expected ad-hoc signature evidence in codesign -d output (Signature=adhoc / Authority=adhoc / flags adhoc)",
    );
    console.error(text.split(/\r?\n/).slice(0, 40).join("\n"));
    process.exit(1);
  }
  console.log("PACKAGED_CODESIGN_IDENTITY_OK=adhoc");
}

console.log("PACKAGED_MAC_CODESIGN_OK=1");
