#!/usr/bin/env node
/**
 * Commit-byte manifest and audit helpers.
 *
 * These helpers intentionally read Git objects (`git show <sha>:<path>`), never
 * working-tree bytes.  A manifest is evidence for a later candidate checkpoint;
 * generating one does not freeze, approve, or promote the candidate.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

export const COMMIT_BYTE_MANIFEST_VERSION = "1";
export const DEFAULT_REQUIRED_PATHS = Object.freeze([
  "firestore.rules",
  "firestore.transition.rules",
  "firestore.indexes.json",
  "storage.rules",
  "functions/scripts/reconcile-portal-print-request-items-prod.ts",
  "packages/shared/src/utils/portalPrintRequestItemProjection.ts",
  "functions/src/lib/portalPrintRequestItemProjectionSync.ts",
  "scripts/commit-byte-manifest.mjs",
  "apps/studio/package.json",
  "package-lock.json",
]);

const SHA_RE = /^[0-9a-f]{40}$/i;

function git(args, cwd) {
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

export function assertFullSha(sha) {
  if (typeof sha !== "string" || !SHA_RE.test(sha)) {
    throw new Error("Candidate SHA must be the full 40-character hexadecimal commit SHA.");
  }
  return sha.toLowerCase();
}

export function assertCleanDevelopmentCheckout({ cwd = process.cwd(), sha, approvedRemoteRef } = {}) {
  const candidateSha = assertFullSha(sha);
  const head = git(["rev-parse", "HEAD"], cwd).toLowerCase();
  if (head !== candidateSha) {
    throw new Error("Candidate SHA must equal the checked-out HEAD.");
  }
  const branch = git(["symbolic-ref", "--quiet", "--short", "HEAD"], cwd);
  if (branch !== "development") {
    throw new Error(`Candidate checkout must be on development, not ${branch || "detached HEAD"}.`);
  }
  if (git(["status", "--porcelain=v1", "--untracked-files=all"], cwd)) {
    throw new Error("Candidate checkout must be clean; modified or untracked paths are present.");
  }
  if (approvedRemoteRef) {
    const remoteSha = git(["rev-parse", "--verify", approvedRemoteRef], cwd).toLowerCase();
    if (remoteSha !== candidateSha) {
      throw new Error("Candidate SHA does not match the approved remote reference.");
    }
  }
  return { sha: candidateSha, branch };
}

export function listCommitPaths(sha, { cwd = process.cwd() } = {}) {
  const candidateSha = assertFullSha(sha);
  const output = execFileSync("git", ["ls-tree", "-r", "--name-only", candidateSha], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return output.split(/\r?\n/).filter(Boolean).sort();
}

export function readCommitBytes(sha, path, { cwd = process.cwd() } = {}) {
  const candidateSha = assertFullSha(sha);
  if (typeof path !== "string" || !path || path.includes("..") || path.startsWith("/")) {
    throw new Error(`Invalid manifest path: ${path}`);
  }
  try {
    return execFileSync("git", ["show", `${candidateSha}:${path}`], {
      cwd,
      encoding: "buffer",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    throw new Error(`Manifest member is not present in commit objects: ${path}`);
  }
}

function classifyPath(path) {
  if (/^(docs|references)\//.test(path)) return "documentation";
  if (/\.rules$|firestore\.indexes\.json$/.test(path)) return "firebase-config";
  if (/package(-lock)?\.json$|electron-builder\.json5$/.test(path)) return "release-config";
  return "runtime";
}

export function generateCommitByteManifest({
  sha,
  paths = DEFAULT_REQUIRED_PATHS,
  cwd = process.cwd(),
  generatedAt = new Date().toISOString(),
} = {}) {
  const candidateSha = assertFullSha(sha);
  const commitPaths = new Set(listCommitPaths(candidateSha, { cwd }));
  const uniquePaths = [...new Set(paths)].sort();
  if (uniquePaths.length !== paths.length) {
    throw new Error("Manifest paths must not contain duplicates.");
  }
  const files = uniquePaths.map((path) => {
    if (!commitPaths.has(path)) throw new Error(`Manifest path is not tracked at candidate SHA: ${path}`);
    const bytes = readCommitBytes(candidateSha, path, { cwd });
    return {
      path,
      kind: classifyPath(path),
      byteLength: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    };
  });
  return {
    manifestVersion: COMMIT_BYTE_MANIFEST_VERSION,
    generator: "scripts/commit-byte-manifest.mjs",
    generatedAt,
    commitSha: candidateSha,
    files,
  };
}

export function auditCommitByteManifest(manifest, {
  sha,
  cwd = process.cwd(),
  requiredPaths = DEFAULT_REQUIRED_PATHS,
} = {}) {
  if (!manifest || manifest.manifestVersion !== COMMIT_BYTE_MANIFEST_VERSION) {
    throw new Error("Unsupported or missing commit-byte manifest version.");
  }
  const candidateSha = assertFullSha(sha);
  if (manifest.commitSha !== candidateSha) throw new Error("Manifest commit SHA mismatch.");
  if (!Array.isArray(manifest.files) || manifest.files.length === 0) {
    throw new Error("Manifest must contain at least one file.");
  }
  const byPath = new Map();
  for (const entry of manifest.files) {
    if (!entry || typeof entry.path !== "string" || byPath.has(entry.path)) {
      throw new Error("Manifest contains a duplicate or invalid path.");
    }
    if (!Number.isInteger(entry.byteLength) || entry.byteLength < 0 || !/^[0-9a-f]{64}$/.test(entry.sha256)) {
      throw new Error(`Manifest entry metadata is invalid: ${entry.path}`);
    }
    byPath.set(entry.path, entry);
  }
  for (const path of requiredPaths) {
    if (!byPath.has(path)) throw new Error(`Manifest is missing required member: ${path}`);
  }
  const mismatches = [];
  for (const entry of manifest.files) {
    const bytes = readCommitBytes(candidateSha, entry.path, { cwd });
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    if (bytes.length !== entry.byteLength || sha256 !== entry.sha256) mismatches.push(entry.path);
  }
  if (mismatches.length) throw new Error(`Manifest byte/hash mismatch: ${mismatches.join(",")}`);
  return { sha: candidateSha, files: manifest.files.length, mismatches: [] };
}

export function auditCandidateManifest({
  sha,
  manifestPath,
  cwd = process.cwd(),
  approvedRemoteRef,
  requiredPaths = DEFAULT_REQUIRED_PATHS,
} = {}) {
  if (!manifestPath) throw new Error("CANDIDATE_MANIFEST_PATH is required.");
  const checkout = assertCleanDevelopmentCheckout({ cwd, sha, approvedRemoteRef });
  const manifest = JSON.parse(readFileSync(resolve(cwd, manifestPath), "utf8"));
  return { checkout, audit: auditCommitByteManifest(manifest, { sha: checkout.sha, cwd, requiredPaths }) };
}

function main() {
  const [shaArg, outputArg] = process.argv.slice(2);
  if (!shaArg || !outputArg) {
    throw new Error("Usage: node scripts/commit-byte-manifest.mjs <full-sha> <output.json>");
  }
  const cwd = process.cwd();
  const checkout = assertCleanDevelopmentCheckout({ cwd, sha: shaArg, approvedRemoteRef: process.env.APPROVED_REMOTE_REF });
  const manifest = generateCommitByteManifest({ sha: checkout.sha, cwd });
  writeFileSync(resolve(cwd, outputArg), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify({ commitSha: manifest.commitSha, files: manifest.files.length, output: outputArg })}\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  try { main(); } catch (error) { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }
}
