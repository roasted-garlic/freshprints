// Runs before every Studio build (see apps/studio/package.json's "build" script) and writes
// apps/studio/electron/generated/packagedBuildConfig.ts — a small, gitignored, build-time-only
// constants file that bakes the release channel into the packaged main process.
//
// Why this exists: relying on a runtime environment variable (FRESH_PRINTS_UPDATE_CHANNEL) for
// the installed application's update channel does not work — CI-job environment variables set via
// $GITHUB_ENV only exist for the lifetime of the GitHub Actions job process, never for the
// installed application launched later on an end user's machine. An installed app has no such
// variable and always fell back to "stable", even when built as a prerelease. This script makes
// the channel a literal, compiled-in value instead.
//
// Run with: node apps/studio/scripts/generate-packaged-build-config.mjs
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const studioRoot = path.join(__dirname, "..");
const outDir = path.join(studioRoot, "electron/generated");
const outFile = path.join(outDir, "packagedBuildConfig.ts");

const rawChannel = process.env.FRESH_PRINTS_UPDATE_CHANNEL;
const channel = rawChannel === "prerelease" ? "prerelease" : "stable";

if (rawChannel !== "prerelease" && rawChannel !== "stable" && rawChannel !== undefined) {
  console.error(
    `[generate-packaged-build-config] FRESH_PRINTS_UPDATE_CHANNEL must be exactly "prerelease" or "stable" (or unset for local dev builds, which default to "stable"). Got: ${JSON.stringify(rawChannel)}`,
  );
  process.exit(1);
}

const diagnosticBuild =
  process.env.STUDIO_DIAGNOSTIC_BUILD === "1" ||
  process.env.STUDIO_DIAGNOSTIC_BUILD === "true" ||
  process.env.FP_DERIVATIVE_LOCUS_DIAG === "1" ||
  process.env.FP_DERIVATIVE_LOCUS_DIAG === "true";

await mkdir(outDir, { recursive: true });

await writeFile(
  outFile,
  `// GENERATED FILE — do not edit by hand. Produced by
// apps/studio/scripts/generate-packaged-build-config.mjs at build time from the
// FRESH_PRINTS_UPDATE_CHANNEL / STUDIO_DIAGNOSTIC_BUILD environment variables available ONLY
// during the build itself (not at application runtime). These values are then compiled into the
// packaged main-process bundle, so the installed application never depends on any environment
// variable being present when it launches.
export const PACKAGED_UPDATE_CHANNEL: "stable" | "prerelease" = ${JSON.stringify(channel)};

/** When true, packaged Studio retains derivative-locus JSONL diagnostics (DEV evidence builds only). */
export const PACKAGED_DERIVATIVE_LOCUS_DIAG: boolean = ${diagnosticBuild ? "true" : "false"};
`,
  "utf8",
);

console.log(
  `[generate-packaged-build-config] Wrote packaged update channel "${channel}", derivativeLocusDiag=${diagnosticBuild} to ${path.relative(studioRoot, outFile)}`,
);
