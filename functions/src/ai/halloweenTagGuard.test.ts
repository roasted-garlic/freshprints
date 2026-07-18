import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  filterUnsupportedHalloweenTags,
  hasHalloweenSupportingCues,
  hasSkeletonOnlySignals,
  shouldStripHalloweenTag,
} from "./halloweenTagGuard";

describe("halloweenTagGuard", () => {
  it("strips halloween when only skeleton signals support it", () => {
    const tags = ["skeleton", "halloween", "funny"];
    const context = {
      title: "Motherhood Rocks",
      description: "A cartoon skeleton giving a rock-on hand sign.",
      tags,
    };

    assert.equal(hasSkeletonOnlySignals(context), true);
    assert.equal(hasHalloweenSupportingCues(context), false);
    assert.equal(shouldStripHalloweenTag(context), true);
    assert.deepEqual(filterUnsupportedHalloweenTags(tags, context), ["skeleton", "funny"]);
  });

  it("keeps halloween when jack-o'-lantern cues are present with a skeleton", () => {
    const tags = ["skeleton", "halloween"];
    const context = {
      title: "Halloween Skeleton",
      description: "A dancing skeleton beside a glowing jack-o'-lantern.",
      tags,
    };

    assert.equal(shouldStripHalloweenTag(context), false);
    assert.deepEqual(filterUnsupportedHalloweenTags(tags, context), tags);
  });

  it("keeps halloween when visible Halloween text is present", () => {
    const tags = ["skeleton", "halloween", "bones"];
    const context = {
      title: "Happy Halloween",
      description: "A skeleton holding a sign.",
      visibleText: ["Happy Halloween"],
      tags,
    };

    assert.equal(shouldStripHalloweenTag(context), false);
  });

  it("does not strip halloween when there are no skeleton signals", () => {
    const tags = ["witch", "halloween", "candy"];
    const context = {
      title: "Witch Brew",
      description: "A witch stirring a cauldron.",
      tags,
    };

    assert.equal(shouldStripHalloweenTag(context), false);
    assert.deepEqual(filterUnsupportedHalloweenTags(tags, context), tags);
  });

  it("does not treat the halloween tag itself as a supporting cue", () => {
    const tags = ["halloween", "skeleton"];
    const context = {
      title: "Cool Bones",
      description: "An edgy skeleton illustration.",
      tags,
    };

    assert.equal(hasHalloweenSupportingCues(context), false);
    assert.equal(shouldStripHalloweenTag(context), true);
  });

  it("leaves tags unchanged when halloween is absent", () => {
    const tags = ["skeleton", "motherhood"];
    const context = {
      description: "A motherhood skeleton design.",
      tags,
    };

    assert.equal(shouldStripHalloweenTag(context), false);
    assert.deepEqual(filterUnsupportedHalloweenTags(tags, context), tags);
  });
});
