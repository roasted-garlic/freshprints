import assert from "node:assert/strict";
import test from "node:test";
import {
  REQUIRED_STABLE_ASSET_COUNT,
  assertPublishedCopy,
  buildPublishPatch,
  draftBody,
  finalBody,
  hasStaleDraftCopy,
  stableReleaseTag,
} from "./studio-github-release-copy.mjs";
import {
  parsePublishArgs,
  publishStudioStableGithubRelease,
  verifyPublishedRelease,
} from "./publish-studio-stable-github-release.mjs";

const SHA = "32101904b29476e514d0f9a9e8fd5c5b508a7d14";
const VERSION = "1.0.9";

function eightAssets() {
  return Array.from({ length: REQUIRED_STABLE_ASSET_COUNT }, (_, i) => ({
    id: i + 1,
    name: `asset-${i}.bin`,
  }));
}

test("draft body keeps the pre-publish warning and sha", () => {
  const body = draftBody(VERSION, SHA);
  assert.match(body, /Fresh Prints Studio 1\.0\.9/);
  assert.match(body, /DRAFT/);
  assert.match(body, /do not publish/);
  assert.match(body, new RegExp(SHA));
  assert.equal(hasStaleDraftCopy(body), true);
});

test("final body includes version and sha and is not draft copy", () => {
  const body = finalBody(VERSION, SHA);
  assert.match(body, /Fresh Prints Studio 1\.0\.9/);
  assert.match(body, /Windows \+ Mac x64 \+ Mac arm64/);
  assert.match(body, new RegExp(`Source: ${SHA}`));
  assert.match(body, /automatic updates supported/);
  assert.match(body, /internal-unsigned/);
  assert.equal(hasStaleDraftCopy(body), false);
  assert.doesNotThrow(() => assertPublishedCopy(body));
});

test("assertPublishedCopy rejects DRAFT and do not publish", () => {
  assert.throws(() => assertPublishedCopy(draftBody(VERSION, SHA)), /draft warning/i);
  assert.throws(() => assertPublishedCopy("Please do not publish this yet"), /draft warning/i);
  assert.throws(() => assertPublishedCopy(""), /empty/i);
});

test("publish PATCH payload sets tag_name, draft false, make_latest true, and final body", () => {
  const patch = buildPublishPatch(VERSION, SHA);
  assert.equal(patch.tag_name, "v1.0.9");
  assert.equal(patch.draft, false);
  assert.equal(patch.make_latest, "true");
  assert.equal(patch.prerelease, false);
  assert.equal(patch.body, finalBody(VERSION, SHA));
  assert.equal(hasStaleDraftCopy(patch.body), false);
});

test("stableReleaseTag prefixes v to semver version", () => {
  assert.equal(stableReleaseTag("1.0.10"), "v1.0.10");
  assert.throws(() => stableReleaseTag(""), /version is required/i);
});

test("verifyPublishedRelease fails when tag_name is not v{version}", () => {
  const published = {
    id: 111,
    draft: false,
    name: VERSION,
    tag_name: "untagged-ac82c9de5862b0ae7d2d",
    target_commitish: SHA,
    body: finalBody(VERSION, SHA),
    assets: eightAssets(),
  };
  assert.throws(
    () =>
      verifyPublishedRelease({
        published,
        latest: { id: 111 },
        expectedId: 111,
        expectedSha: SHA,
        expectedVersion: VERSION,
      }),
    /tag_name mismatch/,
  );
});

test("verifyPublishedRelease fails when Latest id differs", () => {
  const published = {
    id: 111,
    draft: false,
    name: VERSION,
    tag_name: `v${VERSION}`,
    target_commitish: SHA,
    body: finalBody(VERSION, SHA),
    assets: eightAssets(),
  };
  assert.throws(
    () =>
      verifyPublishedRelease({
        published,
        latest: { id: 222 },
        expectedId: 111,
        expectedSha: SHA,
        expectedVersion: VERSION,
      }),
    /GitHub Latest/,
  );
});

test("verifyPublishedRelease passes when Latest matches and copy is final", () => {
  const published = {
    id: 111,
    draft: false,
    name: VERSION,
    tag_name: `v${VERSION}`,
    target_commitish: SHA,
    body: finalBody(VERSION, SHA),
    assets: eightAssets(),
  };
  assert.doesNotThrow(() =>
    verifyPublishedRelease({
      published,
      latest: { id: 111 },
      expectedId: 111,
      expectedSha: SHA,
      expectedVersion: VERSION,
    }),
  );
});

test("parsePublishArgs requires numeric id, version, and 40-char sha", () => {
  const parsed = parsePublishArgs([
    "--release-id",
    "374575547",
    "--version",
    VERSION,
    "--sha",
    SHA,
    "--repo",
    "roasted-garlic/freshprints",
  ]);
  assert.equal(parsed.releaseId, "374575547");
  assert.equal(parsed.version, VERSION);
  assert.equal(parsed.sha, SHA);
  assert.throws(() => parsePublishArgs(["--release-id", "abc", "--version", VERSION, "--sha", SHA]));
  assert.throws(() =>
    parsePublishArgs(["--release-id", "1", "--version", VERSION, "--sha", "notasha"]),
  );
});

test("publish flow PATCHes then fails closed if Latest is a different release", async () => {
  const calls = [];
  const draft = {
    id: 111,
    draft: true,
    name: VERSION,
    tag_name: `v${VERSION}`,
    target_commitish: SHA,
    body: draftBody(VERSION, SHA),
    assets: eightAssets(),
  };
  const published = {
    ...draft,
    draft: false,
    tag_name: `v${VERSION}`,
    body: finalBody(VERSION, SHA),
  };
  await assert.rejects(
    () =>
      publishStudioStableGithubRelease({
        repo: "roasted-garlic/freshprints",
        releaseId: "111",
        version: VERSION,
        sha: SHA,
        getJson: async (apiPath) => {
          calls.push(["GET", apiPath]);
          if (apiPath.endsWith("/releases/latest")) return { id: 999 };
          return calls.filter((c) => c[0] === "PATCH").length ? published : draft;
        },
        patchJson: async (apiPath, body) => {
          calls.push(["PATCH", apiPath, body]);
          assert.equal(body.tag_name, `v${VERSION}`);
          assert.equal(body.draft, false);
          assert.equal(body.make_latest, "true");
          assert.equal(body.body, finalBody(VERSION, SHA));
        },
      }),
    /GitHub Latest/,
  );
  assert.equal(calls.some((c) => c[0] === "PATCH"), true);
});

test("publish flow refuses a non-draft release", async () => {
  await assert.rejects(
    () =>
      publishStudioStableGithubRelease({
        repo: "roasted-garlic/freshprints",
        releaseId: "111",
        version: VERSION,
        sha: SHA,
        getJson: async () => ({
          id: 111,
          draft: false,
          name: VERSION,
          target_commitish: SHA,
          assets: eightAssets(),
        }),
        patchJson: async () => {
          throw new Error("must not PATCH");
        },
      }),
    /not a draft/,
  );
});
