#!/usr/bin/env node
/**
 * Install sharp optional native binaries for a target darwin arch before packaging.
 * Required because npmRebuild is false and macos-latest is arm64 — x64 packages must
 * not embed darwin-arm64 sharp.
 *
 * Usage: node prepare-sharp-for-darwin-arch.mjs <arm64|x64>
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const arch = process.argv[2];
if (arch !== "arm64" && arch !== "x64") {
  console.error("Usage: prepare-sharp-for-darwin-arch.mjs <arm64|x64>");
  process.exit(2);
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

console.log(`[prepare-sharp] installing sharp native deps for darwin-${arch} in ${repoRoot}`);
const result = spawnSync(
  "npm",
  ["install", "--no-save", `--cpu=${arch}`, "--os=darwin", "sharp@^0.33.5"],
  {
    cwd: repoRoot,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: {
      ...process.env,
      npm_config_cpu: arch,
      npm_config_os: "darwin",
    },
  },
);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log(`[prepare-sharp] OK darwin-${arch}`);
