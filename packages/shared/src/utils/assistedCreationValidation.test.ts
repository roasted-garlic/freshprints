import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createEmptyAssistedCreationAnswers,
  parseAssistedCreationAnswers,
  parseAssistedCreationApprovalNote,
  parseAssistedCreationApprovalRating,
  parseAssistedCreationReferenceImageInputs,
} from "./assistedCreationValidation";

describe("parseAssistedCreationAnswers", () => {
  it("accepts a minimal valid payload", () => {
    const empty = createEmptyAssistedCreationAnswers();
    const parsed = parseAssistedCreationAnswers({
      ...empty,
      rawDescription: "  A funny cheetah design  ",
      requestType: "animal_object_character",
      containsText: "no_words",
    });
    assert.equal(parsed.rawDescription, "A funny cheetah design");
    assert.equal(parsed.requestType, "animal_object_character");
    assert.equal(parsed.containsText, "no_words");
    assert.deepEqual(parsed.personalizationTypes, ["no_personalization"]);
  });

  it("requires exact wording when exact_wording is selected", () => {
    const empty = createEmptyAssistedCreationAnswers();
    assert.throws(
      () =>
        parseAssistedCreationAnswers({
          ...empty,
          rawDescription: "Text design",
          containsText: "exact_wording",
          exactText: "   ",
        }),
      /Exact wording/,
    );
  });

  it("rejects mixing no_personalization with other types", () => {
    const empty = createEmptyAssistedCreationAnswers();
    assert.throws(
      () =>
        parseAssistedCreationAnswers({
          ...empty,
          rawDescription: "Named design",
          personalizationTypes: ["no_personalization", "name"],
        }),
      /No personalization/,
    );
  });

  it("requires reference usage when hasReferences is true", () => {
    const empty = createEmptyAssistedCreationAnswers();
    assert.throws(
      () =>
        parseAssistedCreationAnswers({
          ...empty,
          rawDescription: "With refs",
          hasReferences: true,
          referenceUsage: [],
        }),
      /how references would be used/,
    );
  });
});

describe("parseAssistedCreationReferenceImageInputs", () => {
  it("accepts pending paths for the customer", () => {
    const parsed = parseAssistedCreationReferenceImageInputs(
      [
        {
          id: "img1",
          storagePath: "assisted-creation/uid1/pending/img1",
          fileName: "ref.jpg",
          contentType: "image/jpeg",
          sizeBytes: 1024,
        },
      ],
      { customerUid: "uid1", requireCloneUpload: false },
    );
    assert.equal(parsed.length, 1);
    assert.equal(parsed[0]?.id, "img1");
  });

  it("rejects paths outside the customer pending prefix", () => {
    assert.throws(
      () =>
        parseAssistedCreationReferenceImageInputs(
          [
            {
              id: "img1",
              storagePath: "assisted-creation/other/pending/img1",
              fileName: "ref.jpg",
              contentType: "image/jpeg",
              sizeBytes: 1024,
            },
          ],
          { customerUid: "uid1", requireCloneUpload: false },
        ),
      /Invalid reference image path/,
    );
  });

  it("requires an upload when clone usage is selected", () => {
    assert.throws(
      () =>
        parseAssistedCreationReferenceImageInputs([], {
          customerUid: "uid1",
          requireCloneUpload: true,
        }),
      /Clone-with-subtle-changes/,
    );
  });
});

describe("parseAssistedCreationApprovalRating", () => {
  it("accepts 1–5 integers and omits empty", () => {
    assert.equal(parseAssistedCreationApprovalRating(undefined), undefined);
    assert.equal(parseAssistedCreationApprovalRating(4), 4);
    assert.equal(parseAssistedCreationApprovalRating("5"), 5);
  });

  it("rejects out of range or fractional values", () => {
    assert.throws(() => parseAssistedCreationApprovalRating(0), /Rating must be/);
    assert.throws(() => parseAssistedCreationApprovalRating(6), /Rating must be/);
    assert.throws(() => parseAssistedCreationApprovalRating(3.5), /Rating must be/);
  });
});

describe("parseAssistedCreationApprovalNote", () => {
  it("trims optional notes", () => {
    assert.equal(parseAssistedCreationApprovalNote(undefined), undefined);
    assert.equal(parseAssistedCreationApprovalNote("  Looks great  "), "Looks great");
  });
});
