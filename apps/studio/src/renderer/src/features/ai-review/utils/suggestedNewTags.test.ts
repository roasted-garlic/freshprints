import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { SuggestedNewTag } from "@fresh-prints/shared/types/catalogTag.types";
import type { AiReviewDraftForm } from "../types/aiReviewInbox.types";
import { addApprovedSuggestedTagToDraftTags, filterIgnoredSuggestedTags } from "./suggestedNewTags";

const suggestedTags: SuggestedNewTag[] = [
  {
    aliases: [],
    name: "baseball",
    preferredWhen: "Use for baseball designs.",
    source: "ai",
  },
  {
    aliases: ["teach"],
    name: "teacher",
    preferredWhen: "Use for teacher designs.",
    source: "ai",
  },
];

describe("suggestedNewTags", () => {
  it("filters ignored suggestions by normalized name", () => {
    assert.deepEqual(
      filterIgnoredSuggestedTags(suggestedTags, [" Baseball "]).map((tag) => tag.name),
      ["teacher"],
    );
  });

  it("adds an approved suggestion to draft tags without duplicating", () => {
    const draft: AiReviewDraftForm = {
      artworkBackgroundCustomHex: "",
      artworkBackgroundPreset: "grey",
      categoryId: "",
      description: "",
      markAsHalftone: false,
      tagsInput: "summer",
      title: "",
    };

    const updated = addApprovedSuggestedTagToDraftTags(draft, "Baseball");
    assert.equal(updated.tagsInput, "summer, baseball");

    const unchanged = addApprovedSuggestedTagToDraftTags(updated, "baseball");
    assert.equal(unchanged.tagsInput, "summer, baseball");
  });
});
