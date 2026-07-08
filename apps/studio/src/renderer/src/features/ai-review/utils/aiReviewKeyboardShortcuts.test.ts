import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { AiReviewInboxTab } from "../types/aiReviewInbox.types";

function resolveKeyboardShortcutsEnabled(input: {
  selectedDesignId: string | null;
  activeTab: AiReviewInboxTab;
}): boolean {
  return Boolean(input.selectedDesignId);
}

describe("aiReview keyboard shortcuts enablement", () => {
  it("enables J/K on processing when a design is selected", () => {
    assert.equal(
      resolveKeyboardShortcutsEnabled({
        selectedDesignId: "design-1",
        activeTab: "processing",
      }),
      true,
    );
  });

  it("enables J/K on rejected when a design is selected", () => {
    assert.equal(
      resolveKeyboardShortcutsEnabled({
        selectedDesignId: "design-1",
        activeTab: "rejected",
      }),
      true,
    );
  });

  it("disables shortcuts when no design is selected", () => {
    assert.equal(
      resolveKeyboardShortcutsEnabled({
        selectedDesignId: null,
        activeTab: "needs_review",
      }),
      false,
    );
  });
});
