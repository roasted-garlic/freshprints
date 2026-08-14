import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scriptPath = path.join(__dirname, "generate-packaged-build-config.mjs");

function runGeneratorInTempDir(env: Record<string, string | undefined>): {
  status: number;
  outFilePath: string;
  outFileExists: boolean;
  outFileContents: string | null;
} {
  const tempStudioRoot = mkdtempSync(path.join(tmpdir(), "studio-build-config-test-"));
  const tempScriptsDir = path.join(tempStudioRoot, "scripts");
  const outFilePath = path.join(tempStudioRoot, "electron/generated/packagedBuildConfig.ts");

  // Copy the script into a temp "scripts/" dir so its own __dirname-relative math
  // (studioRoot = one level up from scripts/) resolves inside the temp directory, not the real repo.
  mkdirSync(tempScriptsDir, { recursive: true });
  copyFileSync(scriptPath, path.join(tempScriptsDir, "generate-packaged-build-config.mjs"));

  let status = 0;
  try {
    execFileSync("node", ["generate-packaged-build-config.mjs"], {
      cwd: tempScriptsDir,
      env: { ...process.env, ...env },
      stdio: "pipe",
    });
  } catch (error) {
    status = (error as { status?: number }).status ?? 1;
  }

  const outFileExists = existsSync(outFilePath);
  const outFileContents = outFileExists ? readFileSync(outFilePath, "utf8") : null;

  rmSync(tempStudioRoot, { recursive: true, force: true });

  return { status, outFilePath, outFileExists, outFileContents };
}

test("defaults to stable when FRESH_PRINTS_UPDATE_CHANNEL is unset", () => {
  const result = runGeneratorInTempDir({ FRESH_PRINTS_UPDATE_CHANNEL: undefined });
  assert.equal(result.status, 0);
  assert.match(result.outFileContents ?? "", /PACKAGED_UPDATE_CHANNEL.*=\s*"stable"/);
  assert.match(result.outFileContents ?? "", /PACKAGED_DERIVATIVE_LOCUS_DIAG:\s*boolean\s*=\s*false/);
});

test("bakes derivative locus diag when STUDIO_DIAGNOSTIC_BUILD=1", () => {
  const result = runGeneratorInTempDir({
    FRESH_PRINTS_UPDATE_CHANNEL: "stable",
    STUDIO_DIAGNOSTIC_BUILD: "1",
  });
  assert.equal(result.status, 0);
  assert.match(result.outFileContents ?? "", /PACKAGED_DERIVATIVE_LOCUS_DIAG:\s*boolean\s*=\s*true/);
});

test("selects prerelease on the exact opt-in value", () => {
  const result = runGeneratorInTempDir({ FRESH_PRINTS_UPDATE_CHANNEL: "prerelease" });
  assert.equal(result.status, 0);
  assert.match(result.outFileContents ?? "", /PACKAGED_UPDATE_CHANNEL.*=\s*"prerelease"/);
});

test("selects stable on the exact stable value", () => {
  const result = runGeneratorInTempDir({ FRESH_PRINTS_UPDATE_CHANNEL: "stable" });
  assert.equal(result.status, 0);
  assert.match(result.outFileContents ?? "", /PACKAGED_UPDATE_CHANNEL.*=\s*"stable"/);
});

test("fails closed on an unrecognized value rather than silently defaulting", () => {
  const result = runGeneratorInTempDir({ FRESH_PRINTS_UPDATE_CHANNEL: "not-a-real-channel" });
  assert.notEqual(result.status, 0);
  assert.equal(result.outFileExists, false);
});
