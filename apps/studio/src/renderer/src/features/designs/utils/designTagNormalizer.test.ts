import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  MAX_DESIGN_TAG_LENGTH,
  MAX_DESIGN_TAGS,
  formatTagsSanitizationNote,
  normalizeDesignTags,
  sanitizeDesignTagsForDisplay,
} from "./designTagNormalizer";

describe("designTagNormalizer", () => {
  it("normalizeDesignTags throws when a tag exceeds the length limit", () => {
    const longTag = "a".repeat(MAX_DESIGN_TAG_LENGTH + 1);

    assert.throws(
      () => normalizeDesignTags([longTag]),
      /Tags must be 40 characters or fewer/,
    );
  });

  it("sanitizeDesignTagsForDisplay truncates over-length tags", () => {
    const longTag = "you haven't lived until you had dee's nuts in your mouth";
    const result = sanitizeDesignTagsForDisplay([longTag, "cow"]);

    assert.equal(result.truncatedCount, 1);
    assert.equal(result.tags.length, 2);
    assert.equal(result.tags[0]?.length, MAX_DESIGN_TAG_LENGTH);
    assert.equal(result.tags[1], "cow");
  });

  it("sanitizeDesignTagsForDisplay drops tags beyond the maximum count", () => {
    const tags = Array.from({ length: MAX_DESIGN_TAGS + 3 }, (_, index) => `tag-${index}`);
    const result = sanitizeDesignTagsForDisplay(tags);

    assert.equal(result.tags.length, MAX_DESIGN_TAGS);
    assert.equal(result.skippedOverLimitCount, 3);
  });

  it("formatTagsSanitizationNote summarizes adjustments", () => {
    assert.equal(
      formatTagsSanitizationNote({
        tags: ["short"],
        truncatedCount: 2,
        skippedDuplicateCount: 0,
        skippedOverLimitCount: 1,
      }),
      "2 tag(s) shortened to 40 characters. 1 tag(s) omitted (maximum 20 tags).",
    );
  });
});
