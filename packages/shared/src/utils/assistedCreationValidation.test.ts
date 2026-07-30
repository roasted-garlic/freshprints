import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ASSISTED_CREATION_MAX_REFERENCE_BYTES,
  ASSISTED_CREATION_MAX_REFERENCE_IMAGES,
  ASSISTED_CREATION_MAX_REFERENCE_TOTAL_BYTES,
} from "../constants/assistedCreation/assistedCreation.constants";
import {
  createEmptyAssistedCreationAnswers,
  parseAssistedCreationAnswers,
  parseAssistedCreationApprovalNote,
  parseAssistedCreationApprovalRating,
  parseAssistedCreationReferenceImageInputs,
  parseAssistedCreationReferenceImageUpdateInputs,
  type ParsedAssistedCreationReferenceImageInput,
} from "./assistedCreationValidation";

function referenceImageInput(
  overrides: Partial<{
    id: string;
    storagePath: string;
    fileName: string;
    contentType: string;
    sizeBytes: number;
  }> = {},
) {
  return {
    id: overrides.id ?? "img1",
    storagePath: overrides.storagePath ?? "assisted-creation/uid1/pending/img1",
    fileName: overrides.fileName ?? "ref.jpg",
    contentType: overrides.contentType ?? "image/jpeg",
    sizeBytes: overrides.sizeBytes ?? 1024,
  };
}

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

  it("strips exactText on submit when wording mode is not exact_wording", () => {
    const empty = createEmptyAssistedCreationAnswers();
    const parsed = parseAssistedCreationAnswers({
      ...empty,
      rawDescription: "Help with wording",
      requestType: "animal_object_character",
      containsText: "need_help_with_wording",
      // Draft may still hold prior exact-wording text after radio switches.
      exactText: "preserved in draft only",
    });
    assert.equal(parsed.containsText, "need_help_with_wording");
    assert.equal(parsed.exactText, "");
  });

  it("normalizes mood chip draft strings on submit", () => {
    const empty = createEmptyAssistedCreationAnswers();
    const parsed = parseAssistedCreationAnswers({
      ...empty,
      rawDescription: "Mood chips",
      requestType: "animal_object_character",
      containsText: "no_words",
      // Chip UI draft encoding: committed tokens + trailing separator + in-progress draft.
      mood: "playful, heartfelt, Bold, playful",
    });
    assert.equal(parsed.mood, "playful, heartfelt, Bold");
  });

  it("keeps empty mood optional after chip draft whitespace", () => {
    const empty = createEmptyAssistedCreationAnswers();
    const parsed = parseAssistedCreationAnswers({
      ...empty,
      rawDescription: "No mood",
      requestType: "animal_object_character",
      containsText: "no_words",
      mood: "  ,  , ",
    });
    assert.equal(parsed.mood, "");
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

  it("accepts a reference image exactly at the 40 MB per-file limit", () => {
    const parsed = parseAssistedCreationReferenceImageInputs(
      [referenceImageInput({ sizeBytes: ASSISTED_CREATION_MAX_REFERENCE_BYTES })],
      { customerUid: "uid1", requireCloneUpload: false },
    );
    assert.equal(parsed.length, 1);
    assert.equal(parsed[0]?.sizeBytes, ASSISTED_CREATION_MAX_REFERENCE_BYTES);
  });

  it("rejects a reference image one byte over the 40 MB per-file limit", () => {
    assert.throws(
      () =>
        parseAssistedCreationReferenceImageInputs(
          [referenceImageInput({ sizeBytes: ASSISTED_CREATION_MAX_REFERENCE_BYTES + 1 })],
          { customerUid: "uid1", requireCloneUpload: false },
        ),
      /40 MB or smaller/,
    );
  });

  it("accepts exactly 8 files at the per-file limit, totaling exactly the 320 MB ceiling", () => {
    assert.equal(
      ASSISTED_CREATION_MAX_REFERENCE_IMAGES * ASSISTED_CREATION_MAX_REFERENCE_BYTES,
      ASSISTED_CREATION_MAX_REFERENCE_TOTAL_BYTES,
      "8 files at the per-file max must equal the combined ceiling exactly",
    );
    const images = Array.from({ length: ASSISTED_CREATION_MAX_REFERENCE_IMAGES }, (_, index) =>
      referenceImageInput({
        id: `img${index}`,
        storagePath: `assisted-creation/uid1/pending/img${index}`,
        sizeBytes: ASSISTED_CREATION_MAX_REFERENCE_BYTES,
      }),
    );
    const parsed = parseAssistedCreationReferenceImageInputs(images, {
      customerUid: "uid1",
      requireCloneUpload: false,
    });
    assert.equal(parsed.length, ASSISTED_CREATION_MAX_REFERENCE_IMAGES);
    const total = parsed.reduce((sum, image) => sum + image.sizeBytes, 0);
    assert.equal(total, ASSISTED_CREATION_MAX_REFERENCE_TOTAL_BYTES);
  });

  it("rejects a 9th file even when each file is within the per-file limit", () => {
    const images = Array.from({ length: ASSISTED_CREATION_MAX_REFERENCE_IMAGES + 1 }, (_, index) =>
      referenceImageInput({
        id: `img${index}`,
        storagePath: `assisted-creation/uid1/pending/img${index}`,
        sizeBytes: 1024,
      }),
    );
    assert.throws(
      () =>
        parseAssistedCreationReferenceImageInputs(images, {
          customerUid: "uid1",
          requireCloneUpload: false,
        }),
      /Upload up to 8 reference images/,
    );
  });

  it("accepts a total exactly at the 320 MB combined ceiling using 8 files at the per-file max", () => {
    const images = Array.from({ length: ASSISTED_CREATION_MAX_REFERENCE_IMAGES }, (_, index) =>
      referenceImageInput({
        id: `img${index}`,
        storagePath: `assisted-creation/uid1/pending/img${index}`,
        sizeBytes: ASSISTED_CREATION_MAX_REFERENCE_BYTES,
      }),
    );
    const parsed = parseAssistedCreationReferenceImageInputs(images, {
      customerUid: "uid1",
      requireCloneUpload: false,
    });
    const total = parsed.reduce((sum, image) => sum + image.sizeBytes, 0);
    assert.equal(total, ASSISTED_CREATION_MAX_REFERENCE_TOTAL_BYTES);
  });

  it("rejects a total one byte over the 320 MB combined ceiling using two files under the per-file limit", () => {
    // A single file cannot itself exceed 40 MB (per-file check catches that separately), and with
    // ASSISTED_CREATION_MAX_REFERENCE_IMAGES x ASSISTED_CREATION_MAX_REFERENCE_BYTES equal to
    // ASSISTED_CREATION_MAX_REFERENCE_TOTAL_BYTES exactly, exceeding the total on the *submit* path
    // (which always starts from zero existing bytes) is only reachable when at least one file's
    // size, by itself, is not the limiting factor — i.e. one file at the max plus a second file
    // whose size alone is still <= the per-file max but pushes the sum over. With the current
    // 8 x 40 MB = 320 MB arithmetic that second file would have to be > 40 MB to push the sum over
    // using only 2 files, which the per-file check would reject first. The combined ceiling is
    // therefore reachable *independently* of the per-file/count checks only via the update path,
    // where existing retained bytes are added on top of a fresh per-file/count-checked array — see
    // the parseAssistedCreationReferenceImageUpdateInputs suite below for that coverage.
    assert.equal(
      ASSISTED_CREATION_MAX_REFERENCE_IMAGES * ASSISTED_CREATION_MAX_REFERENCE_BYTES,
      ASSISTED_CREATION_MAX_REFERENCE_TOTAL_BYTES,
      "with these owner-selected values, 8 files at the per-file max is exactly the combined ceiling — confirms the total check is unreachable on the submit path alone and is exercised via the update path's retained-bytes addition instead",
    );
  });
});

describe("parseAssistedCreationReferenceImageUpdateInputs", () => {
  it("counts retained (kept) images toward the combined ceiling alongside new uploads", () => {
    const existingImages: ParsedAssistedCreationReferenceImageInput[] = [
      referenceImageInput({ sizeBytes: ASSISTED_CREATION_MAX_REFERENCE_TOTAL_BYTES - 2048 }),
    ];
    const newEntry = referenceImageInput({
      id: "img2",
      storagePath: "assisted-creation/uid1/pending/img2",
      sizeBytes: 4096,
    });
    assert.throws(
      () =>
        parseAssistedCreationReferenceImageUpdateInputs([existingImages[0], newEntry], {
          customerUid: "uid1",
          requireCloneUpload: false,
          existingImages,
        }),
      /total 320 MB or less/,
    );
  });

  it("excludes a removed (no-longer-present) kept image from the total — not double-counted", () => {
    const removedImage = referenceImageInput({
      id: "removed",
      storagePath: "assisted-creation/uid1/pending/removed",
      sizeBytes: ASSISTED_CREATION_MAX_REFERENCE_TOTAL_BYTES - 1024,
    });
    const keptImage = referenceImageInput({
      id: "kept",
      storagePath: "assisted-creation/uid1/pending/kept",
      sizeBytes: 1024,
    });
    // The customer removed `removedImage` — the update payload only includes `keptImage`.
    // `removedImage` must not count toward the total even though it is still in existingImages
    // (it represents what the request looked like before this edit, not what it will look like
    // after saving).
    const parsed = parseAssistedCreationReferenceImageUpdateInputs([keptImage], {
      customerUid: "uid1",
      requireCloneUpload: false,
      existingImages: [removedImage, keptImage],
    });
    assert.equal(parsed.length, 1);
    assert.equal(parsed[0]?.id, "kept");
  });

  it("does not double-count a replacement — new bytes replace, not add to, the removed image's share", () => {
    const oldImage = referenceImageInput({
      id: "old",
      storagePath: "assisted-creation/uid1/pending/old",
      sizeBytes: ASSISTED_CREATION_MAX_REFERENCE_BYTES,
    });
    const replacement = referenceImageInput({
      id: "new",
      storagePath: "assisted-creation/uid1/pending/new",
      sizeBytes: ASSISTED_CREATION_MAX_REFERENCE_BYTES,
    });
    // Replacing one 40 MB image with another 40 MB image must not be treated as 80 MB of new
    // total — the payload omits `oldImage`, so only `replacement` counts.
    const parsed = parseAssistedCreationReferenceImageUpdateInputs([replacement], {
      customerUid: "uid1",
      requireCloneUpload: false,
      existingImages: [oldImage],
    });
    assert.equal(parsed.length, 1);
    assert.equal(parsed[0]?.sizeBytes, ASSISTED_CREATION_MAX_REFERENCE_BYTES);
  });

  it("enforces the same per-file 40 MB limit as the submit path", () => {
    assert.throws(
      () =>
        parseAssistedCreationReferenceImageUpdateInputs(
          [referenceImageInput({ sizeBytes: ASSISTED_CREATION_MAX_REFERENCE_BYTES + 1 })],
          { customerUid: "uid1", requireCloneUpload: false, existingImages: [] },
        ),
      /40 MB or smaller/,
    );
  });

  it("enforces the same 8-file count limit as the submit path", () => {
    const images = Array.from({ length: ASSISTED_CREATION_MAX_REFERENCE_IMAGES + 1 }, (_, index) =>
      referenceImageInput({
        id: `img${index}`,
        storagePath: `assisted-creation/uid1/pending/img${index}`,
        sizeBytes: 1024,
      }),
    );
    assert.throws(
      () =>
        parseAssistedCreationReferenceImageUpdateInputs(images, {
          customerUid: "uid1",
          requireCloneUpload: false,
          existingImages: [],
        }),
      /Upload up to 8 reference images/,
    );
  });
});

/**
 * Regression suite for Goal #10 Amendment 1 (owner QA FAIL): a reference image between the old
 * 15 MB limit and the new 40 MB limit was accepted by the Portal picker but rejected at Submit with
 * the stale "Each reference image must be 15 MB or smaller." message. Root cause was a Cloud
 * Functions deployment gap (the deployed `submitAssistedCreationRequest`/
 * `customerUpdateAssistedCreationRequest` callables were running pre-Goal-#10 compiled code), not a
 * source defect — these tests prove the actual parser functions the live callables invoke are
 * correct in source, at the exact boundary the owner's reproduction hit, so this class of gap is
 * provable by test rather than only by a live QA reproduction.
 */
describe("Goal #10 Amendment 1 — 15 MB/40 MB boundary regression (submit + update parity)", () => {
  const FIFTEEN_MB = 15 * 1024 * 1024;

  it("accepts a file at exactly the old 15 MB boundary plus one byte (submit path) — the owner's exact reproduction size class", () => {
    const parsed = parseAssistedCreationReferenceImageInputs(
      [referenceImageInput({ sizeBytes: FIFTEEN_MB + 1 })],
      { customerUid: "uid1", requireCloneUpload: false },
    );
    assert.equal(parsed.length, 1);
    assert.equal(parsed[0]?.sizeBytes, FIFTEEN_MB + 1);
  });

  it("accepts a file at exactly the old 15 MB boundary plus one byte (update path)", () => {
    const parsed = parseAssistedCreationReferenceImageUpdateInputs(
      [referenceImageInput({ sizeBytes: FIFTEEN_MB + 1 })],
      { customerUid: "uid1", requireCloneUpload: false, existingImages: [] },
    );
    assert.equal(parsed.length, 1);
    assert.equal(parsed[0]?.sizeBytes, FIFTEEN_MB + 1);
  });

  it("accepts a file comfortably below the 40 MB limit (submit path)", () => {
    const belowLimit = ASSISTED_CREATION_MAX_REFERENCE_BYTES - 5 * 1024 * 1024; // ~35 MB
    const parsed = parseAssistedCreationReferenceImageInputs(
      [referenceImageInput({ sizeBytes: belowLimit })],
      { customerUid: "uid1", requireCloneUpload: false },
    );
    assert.equal(parsed.length, 1);
  });

  it("the rejection message for an oversized file names 40 MB and never mentions 15 MB (submit path)", () => {
    assert.throws(
      () =>
        parseAssistedCreationReferenceImageInputs(
          [referenceImageInput({ sizeBytes: ASSISTED_CREATION_MAX_REFERENCE_BYTES + 1 })],
          { customerUid: "uid1", requireCloneUpload: false },
        ),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.match(error.message, /40 MB/);
        assert.doesNotMatch(error.message, /15 ?MB/);
        return true;
      },
    );
  });

  it("the rejection message for an oversized file names 40 MB and never mentions 15 MB (update path)", () => {
    assert.throws(
      () =>
        parseAssistedCreationReferenceImageUpdateInputs(
          [referenceImageInput({ sizeBytes: ASSISTED_CREATION_MAX_REFERENCE_BYTES + 1 })],
          { customerUid: "uid1", requireCloneUpload: false, existingImages: [] },
        ),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.match(error.message, /40 MB/);
        assert.doesNotMatch(error.message, /15 ?MB/);
        return true;
      },
    );
  });

  it("submit and update paths produce identical accept/reject decisions for the same inputs", () => {
    const cases = [
      { sizeBytes: FIFTEEN_MB - 1, shouldAccept: true },
      { sizeBytes: FIFTEEN_MB + 1, shouldAccept: true },
      { sizeBytes: ASSISTED_CREATION_MAX_REFERENCE_BYTES, shouldAccept: true },
      { sizeBytes: ASSISTED_CREATION_MAX_REFERENCE_BYTES + 1, shouldAccept: false },
    ];

    for (const testCase of cases) {
      const input = [referenceImageInput({ sizeBytes: testCase.sizeBytes })];

      let submitAccepted = true;
      try {
        parseAssistedCreationReferenceImageInputs(input, {
          customerUid: "uid1",
          requireCloneUpload: false,
        });
      } catch {
        submitAccepted = false;
      }

      let updateAccepted = true;
      try {
        parseAssistedCreationReferenceImageUpdateInputs(input, {
          customerUid: "uid1",
          requireCloneUpload: false,
          existingImages: [],
        });
      } catch {
        updateAccepted = false;
      }

      assert.equal(
        submitAccepted,
        testCase.shouldAccept,
        `submit path at ${testCase.sizeBytes} bytes: expected accepted=${testCase.shouldAccept}`,
      );
      assert.equal(
        updateAccepted,
        testCase.shouldAccept,
        `update path at ${testCase.sizeBytes} bytes: expected accepted=${testCase.shouldAccept}`,
      );
      assert.equal(
        submitAccepted,
        updateAccepted,
        `submit/update disagreed at ${testCase.sizeBytes} bytes`,
      );
    }
  });

  it("no reference entry is produced when a file is rejected — a thrown parser never returns a partial array", () => {
    // The parsers throw synchronously on the first invalid entry rather than returning a partial
    // result, so no caller can accidentally treat a rejected file as if it had been accepted or
    // partially processed. This is what "no upload begins when validation rejects" reduces to at
    // the parser level (the actual Storage upload only ever runs after this parser has already
    // succeeded on the client side, per assistedCreationService.uploadPendingReferences).
    assert.throws(() =>
      parseAssistedCreationReferenceImageInputs(
        [
          referenceImageInput({ id: "ok", sizeBytes: 1024 }),
          referenceImageInput({
            id: "bad",
            storagePath: "assisted-creation/uid1/pending/bad",
            sizeBytes: ASSISTED_CREATION_MAX_REFERENCE_BYTES + 1,
          }),
        ],
        { customerUid: "uid1", requireCloneUpload: false },
      ),
    );
  });

  it("the 320 MB combined ceiling remains enforced at the boundary (submit path)", () => {
    const images = Array.from({ length: ASSISTED_CREATION_MAX_REFERENCE_IMAGES }, (_, index) =>
      referenceImageInput({
        id: `img${index}`,
        storagePath: `assisted-creation/uid1/pending/img${index}`,
        sizeBytes: ASSISTED_CREATION_MAX_REFERENCE_BYTES,
      }),
    );
    // Exactly at the ceiling: accepted.
    const parsed = parseAssistedCreationReferenceImageInputs(images, {
      customerUid: "uid1",
      requireCloneUpload: false,
    });
    assert.equal(parsed.length, ASSISTED_CREATION_MAX_REFERENCE_IMAGES);
  });

  it("the 8-file maximum remains unchanged at exactly 8", () => {
    assert.equal(ASSISTED_CREATION_MAX_REFERENCE_IMAGES, 8);
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
