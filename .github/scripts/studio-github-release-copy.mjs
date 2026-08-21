#!/usr/bin/env node
/**
 * Draft vs final GitHub Release copy for Fresh Prints Studio stable releases.
 *
 * Usage:
 *   node studio-github-release-copy.mjs draft <version> <sha>
 *   node studio-github-release-copy.mjs final <version> <sha>
 */
import { fileURLToPath } from "node:url";
import path from "node:path";

export const REQUIRED_STABLE_ASSET_COUNT = 8;

const SHA_RE = /^[0-9a-f]{40}$/i;

export function assertVersionAndSha(version, sha) {
  if (typeof version !== "string" || !version.trim()) {
    throw new Error("Studio version is required");
  }
  if (typeof sha !== "string" || !SHA_RE.test(sha)) {
    throw new Error("Studio source SHA must be a 40-character hex commit");
  }
}

export function draftBody(version, sha) {
  assertVersionAndSha(version, sha);
  return `Fresh Prints Studio ${version} (Windows + Mac x64 + Mac arm64). DRAFT — do not publish until dual-platform smoke passes. Build ${sha}.`;
}

export function finalBody(version, sha) {
  assertVersionAndSha(version, sha);
  return [
    `Fresh Prints Studio ${version} (Windows + Mac x64 + Mac arm64).`,
    "",
    `Source: ${sha}`,
    "",
    "Windows: automatic updates supported.",
    "Mac: internal-unsigned / ad-hoc; install via DMG and Open Anyway. Automatic update install is not supported.",
    "",
    "Distribution: stable / internal-unsigned.",
  ].join("\n");
}

export function hasStaleDraftCopy(body) {
  const text = typeof body === "string" ? body : "";
  return /\bdraft\b/i.test(text) || /do not publish/i.test(text);
}

export function assertPublishedCopy(body) {
  if (hasStaleDraftCopy(body)) {
    throw new Error("Published Studio release body still contains draft warning copy");
  }
  if (typeof body !== "string" || !body.trim()) {
    throw new Error("Published Studio release body is empty");
  }
}

export function buildPublishPatch(version, sha) {
  return {
    draft: false,
    make_latest: "true",
    prerelease: false,
    body: finalBody(version, sha),
  };
}

function isExecutedDirectly() {
  const self = fileURLToPath(import.meta.url);
  const invoked = process.argv[1] ? path.resolve(process.argv[1]) : "";
  return path.normalize(self).toLowerCase() === path.normalize(invoked).toLowerCase();
}

if (isExecutedDirectly()) {
  const [mode, version, sha] = process.argv.slice(2);
  if (mode === "draft") {
    process.stdout.write(draftBody(version, sha));
  } else if (mode === "final") {
    process.stdout.write(finalBody(version, sha));
  } else {
    console.error("Usage: node studio-github-release-copy.mjs draft|final <version> <sha>");
    process.exit(1);
  }
}
