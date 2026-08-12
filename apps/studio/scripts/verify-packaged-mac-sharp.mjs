#!/usr/bin/env node
/**
 * Verifies packaged Mac .app Electron binary arch and that sharp loads.
 * Usage: node verify-packaged-mac-sharp.mjs <path-to-.app> [expectedArch]
 */
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const appPath = process.argv[2];
const expectedArch = process.argv[3]; // optional: arm64 | x64
if (!appPath) {
  console.error("Usage: node verify-packaged-mac-sharp.mjs <Fresh Prints.app> [arm64|x64]");
  process.exit(2);
}

const executable = path.join(appPath, "Contents", "MacOS", "Fresh Prints");
if (!existsSync(executable)) {
  console.error(`Packaged Mac executable not found: ${executable}`);
  process.exit(1);
}

if (expectedArch === "arm64" || expectedArch === "x64") {
  const fileResult = spawnSync("file", [executable], { encoding: "utf8" });
  const fileOut = `${fileResult.stdout || ""}${fileResult.stderr || ""}`;
  const expectToken = expectedArch === "arm64" ? "arm64" : "x86_64";
  if (!fileOut.includes(expectToken)) {
    console.error(`PACKAGED_ARCH_FAIL expected=${expectToken} file=${fileOut.trim()}`);
    process.exit(1);
  }
  console.log(`PACKAGED_ELECTRON_ARCH_OK=${expectToken}`);

  // Prefer finding a sharp/vendor .node path that encodes the darwin arch.
  const resources = path.join(appPath, "Contents", "Resources");
  const needle = expectedArch === "arm64" ? "darwin-arm64" : "darwin-x64";
  const found = [];
  const walk = (dir, depth) => {
    if (depth > 8 || found.length > 0) return;
    let entries = [];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const name of entries) {
      const full = path.join(dir, name);
      let st;
      try {
        st = statSync(full);
      } catch {
        continue;
      }
      if (st.isDirectory()) walk(full, depth + 1);
      else if (name.endsWith(".node") && full.includes(needle)) found.push(full);
    }
  };
  if (existsSync(resources)) walk(resources, 0);
  if (found.length === 0) {
    console.error(`PACKAGED_SHARP_ARCH_FAIL: no .node path containing ${needle} under Resources`);
    process.exit(1);
  }
  console.log(`PACKAGED_SHARP_NATIVE_OK=${found[0]}`);
}

const script = `
try {
  const sharp = require('sharp');
  const version = sharp.versions && sharp.versions.sharp ? sharp.versions.sharp : 'unknown';
  console.log('PACKAGED_SHARP_OK=' + version);
  process.exit(0);
} catch (error) {
  console.error('PACKAGED_SHARP_FAIL=' + (error && error.message ? error.message : String(error)));
  process.exit(1);
}
`;

const result = spawnSync(executable, ["-e", script], {
  env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
  encoding: "utf8",
});

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
