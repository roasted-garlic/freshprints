#!/usr/bin/env node
/**
 * Owner-gated publish for a Studio stable GitHub Release draft.
 *
 * Does not run from studio-release.yml. After `APPROVE STUDIO PUBLISH: X.Y.Z` and
 * dual-platform smoke:
 *
 *   node .github/scripts/publish-studio-stable-github-release.mjs \
 *     --release-id <id> --version X.Y.Z --sha <40-char> [--repo owner/name]
 *
 * Sets tag_name=vX.Y.Z, draft=false, make_latest=true, and final published copy.
 * Verifies /releases/latest and canonical tag. Does not rename assets or mutate binaries.
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  REQUIRED_STABLE_ASSET_COUNT,
  assertPublishedCopy,
  assertVersionAndSha,
  buildPublishPatch,
  stableReleaseTag,
} from "./studio-github-release-copy.mjs";

export { buildPublishPatch, REQUIRED_STABLE_ASSET_COUNT };

export function parsePublishArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    const val = argv[i + 1];
    if (key === "--release-id") {
      out.releaseId = val;
      i += 1;
    } else if (key === "--version") {
      out.version = val;
      i += 1;
    } else if (key === "--sha") {
      out.sha = val;
      i += 1;
    } else if (key === "--repo") {
      out.repo = val;
      i += 1;
    } else {
      throw new Error(`Unknown argument: ${key}`);
    }
  }
  if (!out.releaseId || !/^\d+$/.test(String(out.releaseId))) {
    throw new Error("--release-id must be a numeric GitHub release id");
  }
  assertVersionAndSha(out.version, out.sha);
  return out;
}

export function verifyPublishedRelease({
  published,
  latest,
  expectedId,
  expectedSha,
  expectedVersion,
}) {
  if (!published || published.draft !== false) {
    throw new Error("Published Studio release is still a draft");
  }
  if (String(published.id) !== String(expectedId)) {
    throw new Error(`Published release id mismatch: ${published.id} vs ${expectedId}`);
  }
  if (published.target_commitish !== expectedSha) {
    throw new Error(
      `Published target_commitish mismatch: ${published.target_commitish} vs ${expectedSha}`,
    );
  }
  if (published.name !== expectedVersion) {
    throw new Error(`Published release name mismatch: ${published.name} vs ${expectedVersion}`);
  }
  const expectedTag = stableReleaseTag(expectedVersion);
  if (published.tag_name !== expectedTag) {
    throw new Error(
      `Published tag_name mismatch: ${published.tag_name ?? "missing"} vs ${expectedTag}`,
    );
  }
  const assetCount = Array.isArray(published.assets) ? published.assets.length : 0;
  if (assetCount !== REQUIRED_STABLE_ASSET_COUNT) {
    throw new Error(
      `Published asset count ${assetCount} != ${REQUIRED_STABLE_ASSET_COUNT}`,
    );
  }
  assertPublishedCopy(published.body);
  if (!latest || String(latest.id) !== String(expectedId)) {
    throw new Error(
      `GitHub Latest is ${latest?.id ?? "missing"}, expected release ${expectedId}`,
    );
  }
}

export async function publishStudioStableGithubRelease({
  getJson,
  patchJson,
  repo,
  releaseId,
  version,
  sha,
}) {
  const pathRelease = `repos/${repo}/releases/${releaseId}`;
  const before = await getJson(pathRelease);
  if (before.draft !== true) {
    throw new Error(`Release ${releaseId} is not a draft; refusing to publish`);
  }
  if (before.target_commitish !== sha) {
    throw new Error(
      `Draft target_commitish ${before.target_commitish} does not match --sha ${sha}`,
    );
  }
  if (before.name !== version) {
    throw new Error(`Draft name ${before.name} does not match --version ${version}`);
  }
  const beforeAssets = Array.isArray(before.assets) ? before.assets.length : 0;
  if (beforeAssets !== REQUIRED_STABLE_ASSET_COUNT) {
    throw new Error(
      `Draft asset count ${beforeAssets} != ${REQUIRED_STABLE_ASSET_COUNT}`,
    );
  }

  const patch = buildPublishPatch(version, sha);
  await patchJson(pathRelease, patch);

  const published = await getJson(pathRelease);
  const latest = await getJson(`repos/${repo}/releases/latest`);
  verifyPublishedRelease({
    published,
    latest,
    expectedId: releaseId,
    expectedSha: sha,
    expectedVersion: version,
  });

  return {
    id: published.id,
    tag: published.tag_name,
    sha: published.target_commitish,
    draft: published.draft,
    latest: true,
    assetCount: published.assets.length,
  };
}

function ghApiJson(args, input) {
  const result = spawnSync("gh", args, {
    encoding: "utf8",
    input,
    stdio: ["pipe", "pipe", "pipe"],
    env: process.env,
  });
  if (result.status !== 0) {
    const err = (result.stderr || result.stdout || "").trim();
    throw new Error(`gh ${args.join(" ")} failed${err ? `: ${err.slice(0, 500)}` : ""}`);
  }
  return JSON.parse(result.stdout);
}

function defaultRepo(explicit) {
  if (explicit) return explicit;
  if (process.env.GITHUB_REPOSITORY) return process.env.GITHUB_REPOSITORY;
  const result = spawnSync(
    "gh",
    ["repo", "view", "--json", "nameWithOwner", "-q", ".nameWithOwner"],
    { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"], env: process.env },
  );
  if (result.status !== 0) {
    throw new Error("Pass --repo owner/name (could not infer GitHub repository)");
  }
  return result.stdout.trim();
}

function isExecutedDirectly() {
  const self = fileURLToPath(import.meta.url);
  const invoked = process.argv[1] ? path.resolve(process.argv[1]) : "";
  return path.normalize(self).toLowerCase() === path.normalize(invoked).toLowerCase();
}

if (isExecutedDirectly()) {
  const parsed = parsePublishArgs(process.argv.slice(2));
  const repo = defaultRepo(parsed.repo);
  const summary = await publishStudioStableGithubRelease({
    repo,
    releaseId: parsed.releaseId,
    version: parsed.version,
    sha: parsed.sha,
    getJson: (apiPath) => ghApiJson(["api", apiPath]),
    patchJson: (apiPath, body) =>
      ghApiJson(["api", "--method", "PATCH", apiPath, "--input", "-"], JSON.stringify(body)),
  });
  process.stdout.write(
    [
      `PUBLISH_OK release_id=${summary.id} tag=${summary.tag} sha=${summary.sha}`,
      `draft=${summary.draft} latest=${summary.latest} asset_count=${summary.assetCount}`,
      "",
    ].join("\n"),
  );
}
