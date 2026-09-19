import assert from "node:assert/strict";
import test from "node:test";

import type { Design } from "../../designs/types/design.types";
import { createAiReviewDraftFromDesign } from "./aiReviewFormState";

test("AI Review seeds a Staff Artwork approval draft from the persisted AI title", () => {
  const draft = createAiReviewDraftFromDesign({
    id: "staff-design-1",
    title: "a1b2c3d4e5",
    sourceStaffArtworkId: "staff-1",
    aiSuggestions: {
      title: "Accepted Highland Cow Title",
    },
  } as unknown as Design);

  assert.equal(draft.title, "Accepted Highland Cow Title");
});
