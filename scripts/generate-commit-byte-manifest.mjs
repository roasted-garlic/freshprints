#!/usr/bin/env node
/* eslint-env node */
/**
 * Build a release-input manifest from Git object bytes, never from the worktree.
 * The CLI intentionally refuses a dirty tree; generated output is evidence only and does not
 * freeze, stage, commit, push, or approve a candidate.
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const MANIFEST_VERSION = "1";

export function requireCommitSha(value) {
  const sha = String(value ?? "").trim();
  if (!/^[0-9a-f]{40}$/.test(sha)) throw new Error("--sha must be a 40-character lowercase commit SHA.");
  return sha;
}

export function assertCleanCandidate({ sha, head, status }) {
  const candidateSha = requireCommitSha(sha);
  if (head !== candidateSha) throw new Error(`Manifest SHA ${candidateSha} does not match HEAD ${head}.`);
  if (String(status ?? "").trim()) throw new Error("Manifest generation requires a clean worktree.");
  return candidateSha;
}

export function hashBytes(bytes) {
  const value = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  return {
    bytes: value.byteLength,
    sha256: createHash("sha256").update(value).digest("hex"),
  };
}

export function buildCommitByteManifest({ sha, head, status, paths, readBlob }) {
  const candidateSha = assertCleanCandidate({ sha, head, status });
  const uniquePaths = [...new Set((paths ?? []).map((path) => String(path).trim()).filter(Boolean))].sort();
  if (uniquePaths.length === 0) throw new Error("At least one manifest path is required.");
  const files = {};
  for (const path of uniquePaths) {
    let blob;
    try {
      blob = readBlob(candidateSha, path);
    } catch {
      throw new Error(`Manifest member is missing from ${candidateSha}: ${path}`);
    }
    files[path] = hashBytes(blob);
  }
  return {
    manifestVersion: MANIFEST_VERSION,
    candidateSha,
    files,
  };
}

function git(args, options = {}) {
  return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...options }).trim();
}

function readGitBlob(sha, path) {
  return execFileSync("git", ["show", `${sha}:${path}`], { encoding: "buffer", stdio: ["ignore", "pipe", "pipe"] });
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--sha") args.sha = argv[++i];
    else if (token === "--paths-file") args.pathsFile = argv[++i];
    else if (token === "--output") args.output = argv[++i];
    else throw new Error(`Unknown argument: ${token}`);
  }
  if (!args.sha || !args.pathsFile || !args.output) throw new Error("Usage: --sha <40-char-sha> --paths-file <file> --output <file>");
  return args;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const sha = requireCommitSha(args.sha);
    git(["cat-file", "-e", `${sha}^{commit}`]);
    const manifest = buildCommitByteManifest({
      sha,
      head: git(["rev-parse", "HEAD"]),
      status: git(["status", "--porcelain", "--untracked-files=all"]),
      paths: readFileSync(resolve(args.pathsFile), "utf8").split(/\r?\n/),
      readBlob: readGitBlob,
    });
    writeFileSync(resolve(args.output), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    console.log(JSON.stringify({ candidateSha: manifest.candidateSha, files: Object.keys(manifest.files).length, output: resolve(args.output) }));
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
