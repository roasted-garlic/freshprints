import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { BASE_AI_TAG_EXCLUSIONS } from "../../../shared/constants/aiTagExclusions.constants";
import {
  buildTagExclusionPromptSection,
  filterExcludedAiTags,
  isExcludedAiTag,
  mergeTagExclusions,
  resolveAdditionalTagExclusions,
} from "./aiTagExclusions";

describe("aiTagExclusions", () => {
  it("flags exact excluded tokens only", () => {
    const exclusions = mergeTagExclusions();
    assert.equal(isExcludedAiTag("death", exclusions), true);
    assert.equal(isExcludedAiTag("skull", exclusions), true);
    assert.equal(isExcludedAiTag("skeleton", exclusions), false);
    assert.equal(isExcludedAiTag("deadline", exclusions), false);
  });

  it("filters excluded tags from arrays", () => {
    const exclusions = mergeTagExclusions();
    assert.deepEqual(filterExcludedAiTags(["skeleton", "death", "dance", "skull"], exclusions), [
      "skeleton",
      "dance",
    ]);
  });

  it("merges base and additional exclusions", () => {
    const merged = mergeTagExclusions(["witch", "death"]);
    assert.equal(merged.includes("witch"), true);
    assert.equal(merged.includes("death"), true);
    assert.equal(merged.includes("skull"), true);
  });

  it("validates additional exclusions", () => {
    assert.deepEqual(resolveAdditionalTagExclusions(["Witch", "witch", "Bad Tag", "death"]), ["witch"]);
  });

  it("includes every base exclusion token in the prompt section", () => {
    const section = buildTagExclusionPromptSection(mergeTagExclusions(["witch"]));

    for (const token of BASE_AI_TAG_EXCLUSIONS) {
      assert.match(section, new RegExp(`\\b${token}\\b`));
    }

    assert.match(section, /\bwitch\b/);
  });
});
