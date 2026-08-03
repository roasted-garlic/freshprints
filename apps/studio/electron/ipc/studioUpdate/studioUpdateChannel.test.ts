import assert from "node:assert/strict";
import test from "node:test";

import { resolveStudioUpdateChannel } from "./studioUpdateChannel";

// The channel is now a compiled-in constant (apps/studio/electron/generated/packagedBuildConfig.ts,
// produced by apps/studio/scripts/generate-packaged-build-config.mjs), not a runtime environment
// variable — this repo's dev/test default is always "stable" (see the generator script's fallback),
// which is exactly the safe behavior we want to prove: an unconfigured or default build never
// reports itself as a prerelease build.
test("resolves to a valid channel value", () => {
  const channel = resolveStudioUpdateChannel();
  assert.ok(channel === "stable" || channel === "prerelease");
});

test("dev-default generated config resolves to stable", () => {
  // apps/studio/scripts/generate-packaged-build-config.mjs's own default (no
  // FRESH_PRINTS_UPDATE_CHANNEL set) is "stable" — this is what a local `npm run dev`/`npm test`
  // environment actually has on disk, and is asserted directly rather than re-implementing the
  // generator's logic here.
  assert.equal(resolveStudioUpdateChannel(), "stable");
});
