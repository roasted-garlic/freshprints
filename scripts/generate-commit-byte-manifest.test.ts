import assert from "node:assert/strict";
import test from "node:test";

import {
  assertCleanCandidate,
  buildCommitByteManifest,
  hashBytes,
  requireCommitSha,
} from "./generate-commit-byte-manifest.mjs";

const SHA = "a".repeat(40);

test("requires an explicit full lowercase commit SHA", () => {
  assert.equal(requireCommitSha(SHA), SHA);
  assert.throws(() => requireCommitSha("short"), /40-character/);
  assert.throws(() => requireCommitSha("A".repeat(40)), /40-character/);
});

test("rejects SHA mismatch and dirty or untracked worktrees", () => {
  assert.throws(() => assertCleanCandidate({ sha: SHA, head: "b".repeat(40), status: "" }), /does not match/);
  assert.throws(() => assertCleanCandidate({ sha: SHA, head: SHA, status: " M firestore.rules" }), /clean worktree/);
  assert.throws(() => assertCleanCandidate({ sha: SHA, head: SHA, status: "?? new.ts" }), /clean worktree/);
});

test("hashes committed blob bytes, deduplicates paths, and rejects missing members", () => {
  const manifest = buildCommitByteManifest({
    sha: SHA,
    head: SHA,
    status: "",
    paths: ["b.txt", "a.txt", "a.txt"],
    readBlob: (_sha: string, path: string) => Buffer.from(path, "utf8"),
  });
  assert.deepEqual(Object.keys(manifest.files), ["a.txt", "b.txt"]);
  assert.deepEqual(manifest.files["a.txt"], hashBytes("a.txt"));
  assert.throws(
    () => buildCommitByteManifest({ sha: SHA, head: SHA, status: "", paths: ["missing"], readBlob: () => { throw new Error("missing"); } }),
    /missing from/,
  );
});
