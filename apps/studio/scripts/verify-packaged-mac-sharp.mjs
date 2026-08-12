#!/usr/bin/env node
/**
 * Verifies sharp loads from a packaged Fresh Prints Studio macOS .app.
 * Usage: node apps/studio/scripts/verify-packaged-mac-sharp.mjs <path-to-.app>
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const appPath = process.argv[2];
if (!appPath) {
  console.error("Usage: node verify-packaged-mac-sharp.mjs <Fresh Prints.app>");
  process.exit(2);
}

const executable = path.join(appPath, "Contents", "MacOS", "Fresh Prints");
if (!existsSync(executable)) {
  console.error(`Packaged Mac executable not found: ${executable}`);
  process.exit(1);
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
