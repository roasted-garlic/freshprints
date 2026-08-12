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
import { execFileSync } from "node:child_process";
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

try {
  execFileSync("codesign", ["-v", "-vvv", "--strict", "--deep", appPath], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  console.log("PACKAGED_CODESIGN_VERIFY_OK=1");
} catch (err) {
  const stderr = err && err.stderr ? String(err.stderr) : String(err);
  console.error("codesign --strict --deep failed:");
  console.error(stderr);
  process.exit(1);
}

let display = "";
try {
  display = execFileSync("codesign", ["-d", "-vvv", appPath], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
} catch (err) {
  // codesign -d writes details to stderr on success on some macOS versions
  display = err && err.stderr ? String(err.stderr) : "";
  if (!display) {
    console.error("codesign -d -vvv failed to produce display output");
    process.exit(1);
  }
}

// Log non-secret identity evidence
const lines = display.split(/\r?\n/).filter((line) =>
  /^(Authority|TeamIdentifier|Signature|Identifier|Format|Flags|Runtime Version)=/.test(line) ||
  line.includes("Signature=") ||
  line.includes("Authority=") ||
  line.includes("TeamIdentifier=") ||
  line.includes("Flags="),
);
for (const line of lines.slice(0, 40)) {
  console.log(`CODESIGN_DISPLAY: ${line}`);
}

const lower = display.toLowerCase();
const looksAdhoc =
  lower.includes("signature=adhoc") ||
  lower.includes("flags=0x2(adhoc)") ||
  /\bflags=0x[0-9a-f]*2\(adhoc\)/i.test(display) ||
  lower.includes("authority=adhoc") ||
  (lower.includes("teamidentifier=not set") && lower.includes("signature=adhoc"));

const looksDeveloperId = /developer id application:/i.test(display);

if (expectedMode === "adhoc") {
  if (looksDeveloperId) {
    console.error("Expected ad-hoc internal signature but Developer ID authority was present");
    process.exit(1);
  }
  if (!looksAdhoc) {
    console.error("Expected ad-hoc signature evidence in codesign -d output (Signature=adhoc / Authority=adhoc)");
    console.error(display.split(/\r?\n/).slice(0, 30).join("\n"));
    process.exit(1);
  }
  console.log("PACKAGED_CODESIGN_IDENTITY_OK=adhoc");
}

console.log("PACKAGED_MAC_CODESIGN_OK=1");
