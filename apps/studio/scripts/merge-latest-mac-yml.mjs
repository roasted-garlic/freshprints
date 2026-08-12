#!/usr/bin/env node
/**
 * Merge per-arch latest-mac.yml manifests into one updater feed.
 * electron-updater selects the matching arch entry from files[] by filename.
 *
 * Usage: node merge-latest-mac-yml.mjs <arm64.yml> <x64.yml> <out.yml>
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, statSync } from "node:fs";
import path from "node:path";

function parseSimpleYaml(text) {
  const versionMatch = text.match(/^version:\s*(.+)$/m);
  const dateMatch = text.match(/^releaseDate:\s*'?([^'\n]+)'?/m);
  const files = [];
  const fileBlocks = text.split(/\n\s*-\s+url:/).slice(1);
  for (const block of fileBlocks) {
    const url = block.match(/^\s*(.+)$/m)?.[1]?.trim();
    const sha512 = block.match(/sha512:\s*(\S+)/)?.[1];
    const size = Number(block.match(/size:\s*(\d+)/)?.[1]);
    if (!url || !sha512 || !Number.isFinite(size)) {
      throw new Error(`Failed to parse file entry from:\n${block.slice(0, 200)}`);
    }
    files.push({ url, sha512, size });
  }
  if (!versionMatch) throw new Error("missing version in mac updater yml");
  return {
    version: versionMatch[1].trim(),
    releaseDate: dateMatch?.[1]?.trim() || new Date().toISOString(),
    files,
  };
}

function assertArchUrls(files, arch) {
  const needle = `-Mac-${arch}-`;
  const hits = files.filter((f) => f.url.includes(needle));
  if (hits.length === 0) {
    throw new Error(`No ${arch} URLs containing ${needle} in manifest files`);
  }
  return hits;
}

const [, , armPath, x64Path, outPath] = process.argv;
if (!armPath || !x64Path || !outPath) {
  console.error("Usage: merge-latest-mac-yml.mjs <arm64.yml> <x64.yml> <out.yml>");
  process.exit(2);
}

const arm = parseSimpleYaml(readFileSync(armPath, "utf8"));
const x64 = parseSimpleYaml(readFileSync(x64Path, "utf8"));
if (arm.version !== x64.version) {
  throw new Error(`version mismatch arm=${arm.version} x64=${x64.version}`);
}

const armFiles = assertArchUrls(arm.files, "arm64");
const x64Files = assertArchUrls(x64.files, "x64");

// Prefer ZIP as primary path (electron-updater Mac default); keep DMGs listed too.
const armZip = armFiles.find((f) => f.url.endsWith(".zip")) || armFiles[0];
const mergedFiles = [...armFiles, ...x64Files];

// Collision check: no shared URLs across arches
const urls = mergedFiles.map((f) => f.url);
if (new Set(urls).size !== urls.length) {
  throw new Error(`duplicate updater URLs after merge: ${urls.join(", ")}`);
}
if (mergedFiles.some((f) => f.url.includes(" "))) {
  throw new Error("merged updater URLs must not contain spaces");
}

const lines = [
  `version: ${arm.version}`,
  "files:",
  ...mergedFiles.flatMap((f) => [
    `  - url: ${f.url}`,
    `    sha512: ${f.sha512}`,
    `    size: ${f.size}`,
  ]),
  `path: ${armZip.url}`,
  `sha512: ${armZip.sha512}`,
  `releaseDate: '${arm.releaseDate}'`,
  "",
];

writeFileSync(outPath, lines.join("\n"), "utf8");
console.log(
  `MERGED_LATEST_MAC version=${arm.version} files=${mergedFiles.length} out=${path.basename(outPath)}`,
);

// Soft checksum of output for CI logs (not a secret).
const digest = createHash("sha256").update(readFileSync(outPath)).digest("hex");
console.log(`MERGED_LATEST_MAC_SHA256=${digest} bytes=${statSync(outPath).size}`);
