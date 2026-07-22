import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { AssistedCreationAnswers } from "../types/assistedCreation/assistedCreation.types";
import {
  buildAssistedCreationAiContextProfile,
  buildAssistedCreationReferenceImageLabel,
} from "./assistedCreationAiContextProfile";
import {
  buildAssistedCreationAiArtworkPrompt,
  buildAssistedCreationFullAiInput,
  ASSISTED_CREATION_AI_ARTWORK_PROMPT_REFERENCE_SENTENCE,
} from "./assistedCreationAiArtworkPrompt";

describe("buildAssistedCreationReferenceImageLabel", () => {
  it("uses 1-based REFERENCE_IMAGE_N labels", () => {
    assert.equal(buildAssistedCreationReferenceImageLabel(0), "REFERENCE_IMAGE_1");
    assert.equal(buildAssistedCreationReferenceImageLabel(1), "REFERENCE_IMAGE_2");
    assert.equal(buildAssistedCreationReferenceImageLabel(7), "REFERENCE_IMAGE_8");
  });
});

function sparseAnswers(
  overrides: Partial<AssistedCreationAnswers> = {},
): AssistedCreationAnswers {
  return {
    answersVersion: 1,
    rawDescription: "",
    requestType: "not_sure",
    containsText: "not_sure",
    exactText: "",
    textCapitalizationNotes: "",
    textPunctuationNotes: "",
    textLineBreaksExact: false,
    textLayoutFlexible: false,
    primarySubject: "",
    additionalSubjects: "",
    subjectAction: "",
    props: "",
    setting: "",
    occasion: "",
    audience: "",
    personalizationTypes: [],
    exactRequirements: [],
    flexibilityLevel: "creative_changes_fine",
    stylePreferences: [],
    mood: "",
    includedColors: "",
    excludedColors: "",
    garmentColor: "",
    composition: "no_preference",
    hasReferences: false,
    referenceUsage: [],
    ...overrides,
  };
}

describe("buildAssistedCreationAiContextProfile", () => {
  it("maps populated answersVersion 1 fields and omits empty optionals", () => {
    const profile = buildAssistedCreationAiContextProfile({
      id: "req-1",
      fulfillmentMode: "proof_image",
      answers: sparseAnswers({
        rawDescription: "A playful fox holding a coffee cup",
        requestType: "animal_object_character",
        containsText: "no_words",
        primarySubject: "fox",
        subjectAction: "holding a coffee cup",
        stylePreferences: ["bold", "minimal"],
        mood: "playful, witty",
        includedColors: "orange, cream",
        excludedColors: "neon green",
        composition: "centered_main_subject",
        referenceUsage: ["layout_reference", "subject_reference"],
        hasReferences: true,
      }),
      referenceImages: [
        {
          id: "a",
          storagePath: "assisted-creation/u/req-1/references/a.png",
          fileName: "fox.png",
          contentType: "image/png",
          sizeBytes: 10,
          uploadedAt: null,
        },
        {
          id: "b",
          storagePath: "assisted-creation/u/req-1/references/b.png",
          fileName: "cup.png",
          contentType: "image/png",
          sizeBytes: 10,
          uploadedAt: null,
        },
      ],
    });

    const root = profile.image_context_profile as Record<string, unknown>;
    assert.equal(root.schema_version, 1);
    assert.equal(root.type, "graphic design");
    const summary = root.request_summary as Record<string, unknown>;
    assert.equal(summary.request_id, "req-1");
    assert.equal(summary.selected_path, "animal_object_character");
    assert.equal(summary.fulfillment_mode, "proof_image");
    assert.equal("title" in summary, false);

    const submission = root.customer_submission as Record<string, unknown>;
    assert.equal(submission.raw_description, "A playful fox holding a coffee cup");
    assert.equal(submission.primary_subject, "fox");
    assert.equal("exact_text" in submission, false);

    const refs = root.reference_images as Array<Record<string, unknown>>;
    assert.equal(refs.length, 2);
    assert.equal(refs[0]?.reference, "REFERENCE_IMAGE_1");
    assert.equal(refs[1]?.reference, "REFERENCE_IMAGE_2");

    const serialized = JSON.stringify(profile);
    assert.equal(serialized.includes("storagePath"), false);
    assert.equal(serialized.includes("assisted-creation/"), false);
    assert.equal(serialized.includes("fox.png"), false);
    assert.equal(serialized.includes("@"), false);
  });

  it("omits reference_images and reference prompt sentence when no attachments", () => {
    const profile = buildAssistedCreationAiContextProfile({
      id: "req-2",
      answers: sparseAnswers({
        rawDescription: "Simple text design",
        requestType: "phrase_or_saying",
        containsText: "exact_wording",
        exactText: "HELLO WORLD",
        textCapitalizationNotes: "all caps",
      }),
      referenceImages: [],
    });
    const root = profile.image_context_profile as Record<string, unknown>;
    assert.equal("reference_images" in root, false);
    const submission = root.customer_submission as Record<string, unknown>;
    assert.deepEqual(submission.exact_text, ["HELLO WORLD"]);
    assert.equal(submission.text_capitalization_notes, "all caps");

    const prompt = buildAssistedCreationAiArtworkPrompt({ hasReferenceImages: false });
    assert.equal(prompt.includes(ASSISTED_CREATION_AI_ARTWORK_PROMPT_REFERENCE_SENTENCE), false);
  });

  it("preserves exact customer wording and includes reference sentence when refs exist", () => {
    const profile = buildAssistedCreationAiContextProfile({
      id: "req-3",
      answers: sparseAnswers({
        containsText: "exact_wording",
        exactText: "Keep This Exact!",
        rawDescription: "badge",
      }),
      referenceImages: [
        {
          id: "r1",
          storagePath: "path/secret",
          fileName: "secret.png",
          contentType: "image/png",
          sizeBytes: 1,
          uploadedAt: null,
        },
      ],
    });
    const submission = (profile.image_context_profile as Record<string, unknown>)
      .customer_submission as Record<string, unknown>;
    assert.deepEqual(submission.exact_text, ["Keep This Exact!"]);

    const prompt = buildAssistedCreationAiArtworkPrompt({ hasReferenceImages: true });
    assert.ok(prompt.includes(ASSISTED_CREATION_AI_ARTWORK_PROMPT_REFERENCE_SENTENCE));

    const full = buildAssistedCreationFullAiInput({
      hasReferenceImages: true,
      profile,
    });
    assert.ok(full.includes("Keep This Exact!"));
    assert.ok(full.includes("REFERENCE_IMAGE_1"));
    assert.equal(full.includes("path/secret"), false);
  });

  it("handles sparse legacy-style v1 docs without inventing fields", () => {
    const profile = buildAssistedCreationAiContextProfile({
      id: "legacy-1",
      answers: sparseAnswers({
        rawDescription: "Just a sketch idea",
      }),
    });
    const root = profile.image_context_profile as Record<string, unknown>;
    const submission = root.customer_submission as Record<string, unknown>;
    assert.equal(submission.raw_description, "Just a sketch idea");
    assert.equal("primary_subject" in submission, false);
    assert.equal("reference_images" in root, false);
  });
});
