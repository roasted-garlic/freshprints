import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  answersForFirestore,
  assertEtsyRecommendationSchemaVersion,
  parseEtsyRecommendationAnswers,
} from "./etsyRecommendationValidation";

describe("parseEtsyRecommendationAnswers", () => {
  it("requires subjectText or legacy subjects", () => {
    assert.throws(() => parseEtsyRecommendationAnswers({}), /Describe what/);
  });

  it("accepts subjectText only", () => {
    const answers = parseEtsyRecommendationAnswers({
      subjectText: "highland cow",
      wording: "   ",
    });
    assert.deepEqual(answers, { subjectText: "highland cow" });
  });

  it("accepts legacy subjects only", () => {
    const answers = parseEtsyRecommendationAnswers({
      subjects: ["highland_cow"],
    });
    assert.deepEqual(answers, { subjects: ["highland_cow"] });
  });

  it("keeps optional style and wording with subjectText", () => {
    const answers = parseEtsyRecommendationAnswers({
      subjectText: "Wednesday Addams",
      styles: ["Funny", "Sarcastic"],
      wording: "Who knew",
    });
    assert.deepEqual(answers, {
      subjectText: "Wednesday Addams",
      styles: ["Funny", "Sarcastic"],
      wording: "Who knew",
    });
  });

  it("accepts free-text tone / style", () => {
    const answers = parseEtsyRecommendationAnswers({
      subjectText: "highland cow",
      styles: ["whimsical gothic"],
    });
    assert.deepEqual(answers, {
      subjectText: "highland cow",
      styles: ["whimsical gothic"],
    });
  });

  it("rejects tone / style over max length", () => {
    assert.throws(
      () =>
        parseEtsyRecommendationAnswers({
          subjectText: "cow",
          styles: ["x".repeat(61)],
        }),
      /60 characters/,
    );
  });

  it("accepts exact saying within max length (attitude sample)", () => {
    const wording = "Apparently I have an attitude, who knew!?";
    assert.equal(wording.length, 41);
    const answers = parseEtsyRecommendationAnswers({
      subjectText: "attitude",
      wording,
    });
    assert.equal(answers.wording, wording);
  });

  it("rejects exact saying over max length", () => {
    assert.throws(
      () =>
        parseEtsyRecommendationAnswers({
          subjectText: "cow",
          wording: "x".repeat(81),
        }),
      /80 characters/,
    );
  });

  it("rejects too many styles", () => {
    assert.throws(
      () =>
        parseEtsyRecommendationAnswers({
          subjectText: "cow",
          styles: ["Funny", "Cute", "Bold"],
        }),
      /up to 2 styles/,
    );
  });

  it("rejects subjectText over 80 characters", () => {
    assert.throws(
      () =>
        parseEtsyRecommendationAnswers({
          subjectText: "x".repeat(81),
        }),
      /80 characters/,
    );
  });

  it("rejects AI / Assisted / rights fields", () => {
    assert.throws(
      () => parseEtsyRecommendationAnswers({ subjectText: "cow", aiStyle: "cartoon" }),
      /Unsupported field/,
    );
  });

  it("answersForFirestore omits undefined optionals", () => {
    assert.deepEqual(answersForFirestore({ subjectText: "cow" }), { subjectText: "cow" });
    assert.deepEqual(answersForFirestore({ subjects: ["cow"] }), { subjects: ["cow"] });
  });

  it("rejects unknown schema versions", () => {
    assert.throws(() => assertEtsyRecommendationSchemaVersion(3), /Unsupported/);
    assert.doesNotThrow(() => assertEtsyRecommendationSchemaVersion(1));
  });
});
