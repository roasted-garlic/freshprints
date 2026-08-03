import assert from "node:assert/strict";
import test from "node:test";

import { resolveStudioUpdateChannel } from "./studioUpdateChannel";
import { PACKAGED_UPDATE_CHANNEL } from "../../generated/packagedBuildConfig";

// The channel is a compiled-in constant (apps/studio/electron/generated/packagedBuildConfig.ts,
// produced by apps/studio/scripts/generate-packaged-build-config.mjs), not a runtime environment
// variable. This test must validate whatever the generator actually produced for the build
// currently under test — a release workflow run legitimately generates "prerelease" — not assume
// a fixed value. Default/stable/prerelease/invalid *generator* behavior is covered exhaustively by
// apps/studio/scripts/generate-packaged-build-config.test.ts, which exercises the generator
// directly against controlled inputs; this file only proves the resolver reads that output
// correctly.
test("resolves to a valid channel value", () => {
  const channel = resolveStudioUpdateChannel();
  assert.ok(channel === "stable" || channel === "prerelease");
});

test("resolves the generated packaged channel", () => {
  assert.equal(resolveStudioUpdateChannel(), PACKAGED_UPDATE_CHANNEL);
});
