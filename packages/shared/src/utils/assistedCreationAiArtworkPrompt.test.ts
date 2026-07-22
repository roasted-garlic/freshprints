import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ASSISTED_CREATION_AI_ARTWORK_PROMPT_BASE,
  ASSISTED_CREATION_AI_ARTWORK_PROMPT_REFERENCE_SENTENCE,
  buildAssistedCreationAiArtworkPrompt,
  buildAssistedCreationFullAiInput,
} from "./assistedCreationAiArtworkPrompt";

describe("buildAssistedCreationAiArtworkPrompt", () => {
  it("returns base prompt without reference sentence when no refs", () => {
    const prompt = buildAssistedCreationAiArtworkPrompt({ hasReferenceImages: false });
    assert.equal(prompt, ASSISTED_CREATION_AI_ARTWORK_PROMPT_BASE);
    assert.equal(prompt.includes(ASSISTED_CREATION_AI_ARTWORK_PROMPT_REFERENCE_SENTENCE), false);
  });

  it("inserts reference sentence after the first sentence when refs exist", () => {
    const prompt = buildAssistedCreationAiArtworkPrompt({ hasReferenceImages: true });
    assert.ok(prompt.startsWith("Create the requested DTF apparel artwork from the JSON context below."));
    assert.ok(prompt.includes(ASSISTED_CREATION_AI_ARTWORK_PROMPT_REFERENCE_SENTENCE));
    assert.ok(prompt.includes("Preserve all required wording"));
  });

  it("builds full AI input as prompt + blank line + JSON", () => {
    const full = buildAssistedCreationFullAiInput({
      hasReferenceImages: false,
      profile: { image_context_profile: { schema_version: 1 } },
    });
    assert.ok(full.startsWith(ASSISTED_CREATION_AI_ARTWORK_PROMPT_BASE));
    assert.ok(full.includes('\n\n{\n  "image_context_profile"'));
  });
});
