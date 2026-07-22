import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createEmptyAssistedCreationAnswers } from "./assistedCreationValidation";
import { buildAssistedCreationAnswerDisplayRows } from "./assistedCreationAnswerDisplay";

describe("buildAssistedCreationAnswerDisplayRows", () => {
  it("returns empty for null/undefined", () => {
    assert.deepEqual(buildAssistedCreationAnswerDisplayRows(null), []);
    assert.deepEqual(buildAssistedCreationAnswerDisplayRows(undefined), []);
  });

  it("excludes empty strings and empty arrays", () => {
    const answers = createEmptyAssistedCreationAnswers();
    answers.requestType = "animal_object_character";
    answers.containsText = "no_words";
    answers.primarySubject = "  ";
    answers.additionalSubjects = "";
    answers.mood = "";
    answers.stylePreferences = [];
    answers.personalizationTypes = [];

    const rows = buildAssistedCreationAnswerDisplayRows(answers);
    const labels = rows.map((row) => row.label);

    assert.ok(labels.includes("Request type"));
    assert.ok(labels.includes("Wording"));
    assert.ok(!labels.includes("Primary subject"));
    assert.ok(!labels.includes("Additional subjects"));
    assert.ok(!labels.includes("Mood"));
    assert.ok(!labels.includes("Styles"));
    assert.ok(!labels.includes("Personalization"));
    assert.ok(!labels.includes("Capitalization notes"));
    assert.ok(!labels.includes("Text layout"));
    assert.ok(!labels.includes("Line breaks"));
  });

  it("includes filled subject extras Studio previously omitted", () => {
    const answers = createEmptyAssistedCreationAnswers();
    answers.requestType = "animal_object_character";
    answers.containsText = "no_words";
    answers.primarySubject = "Cheetah";
    answers.additionalSubjects = "Zebra";
    answers.subjectAction = "Running";
    answers.props = "Sunglasses";
    answers.setting = "Savannah";

    const byLabel = Object.fromEntries(
      buildAssistedCreationAnswerDisplayRows(answers).map((row) => [row.label, row.value]),
    );

    assert.equal(byLabel["Primary subject"], "Cheetah");
    assert.equal(byLabel["Additional subjects"], "Zebra");
    assert.equal(byLabel.Action, "Running");
    assert.equal(byLabel.Props, "Sunglasses");
    assert.equal(byLabel.Setting, "Savannah");
  });

  it("includes exact-wording notes and checkbox states when selected", () => {
    const answers = createEmptyAssistedCreationAnswers();
    answers.containsText = "exact_wording";
    answers.exactText = "HELLO WORLD";
    answers.textCapitalizationNotes = "All caps";
    answers.textPunctuationNotes = "No period";
    answers.textLineBreaksExact = true;
    answers.textLayoutFlexible = false;

    const byLabel = Object.fromEntries(
      buildAssistedCreationAnswerDisplayRows(answers).map((row) => [row.label, row.value]),
    );

    assert.equal(byLabel["Exact text"], "HELLO WORLD");
    assert.equal(byLabel["Capitalization notes"], "All caps");
    assert.equal(byLabel["Punctuation notes"], "No period");
    assert.equal(byLabel["Line breaks"], "Keep line breaks exact");
    assert.equal(byLabel["Text layout"], "Keep layout exact");
  });

  it("shows flexible layout when exact-wording checkbox stays checked", () => {
    const answers = createEmptyAssistedCreationAnswers();
    answers.containsText = "exact_wording";
    answers.exactText = "Hi";
    answers.textLayoutFlexible = true;
    answers.textLineBreaksExact = false;

    const byLabel = Object.fromEntries(
      buildAssistedCreationAnswerDisplayRows(answers).map((row) => [row.label, row.value]),
    );

    assert.equal(byLabel["Text layout"], "Layout may be flexible");
    assert.ok(!("Line breaks" in byLabel));
  });

  it("includes selected enums, multi-selects, and reference usage", () => {
    const answers = createEmptyAssistedCreationAnswers();
    answers.requestType = "quote_text";
    answers.containsText = "flexible_wording";
    answers.flexibilityLevel = "somewhat_flexible";
    answers.composition = "centered";
    answers.personalizationTypes = ["name", "date"];
    answers.stylePreferences = ["funny", "bold"];
    answers.exactRequirements = ["colors"];
    answers.referenceUsage = ["style_inspiration", "clone_with_subtle_changes"];
    answers.includedColors = "teal";
    answers.excludedColors = "neon";
    answers.garmentColor = "black";
    answers.occasion = "Birthday";
    answers.audience = "Kids";
    answers.mood = "Playful";

    const byLabel = Object.fromEntries(
      buildAssistedCreationAnswerDisplayRows(answers).map((row) => [row.label, row.value]),
    );

    assert.match(byLabel["Request type"] ?? "", /quote|text/i);
    assert.match(byLabel.Wording ?? "", /flexible/i);
    assert.match(byLabel.Flexibility ?? "", /somewhat/i);
    assert.match(byLabel.Composition ?? "", /center/i);
    assert.match(byLabel.Personalization ?? "", /name/i);
    assert.match(byLabel.Styles ?? "", /Funny/);
    assert.match(byLabel["Must match references"] ?? "", /./);
    assert.match(byLabel["Reference usage"] ?? "", /Style inspiration/);
    assert.match(byLabel["Reference usage"] ?? "", /Clone/);
    assert.equal(byLabel["Colors include"], "teal");
    assert.equal(byLabel["Colors avoid"], "neon");
    assert.equal(byLabel.Garment, "black");
    assert.equal(byLabel.Occasion, "Birthday");
    assert.equal(byLabel.Audience, "Kids");
    assert.equal(byLabel.Mood, "Playful");
  });

  it("omits preserved exactText draft when wording mode is not exact_wording", () => {
    const answers = createEmptyAssistedCreationAnswers();
    answers.containsText = "need_help_with_wording";
    answers.exactText = "stale draft wording";
    answers.textCapitalizationNotes = "should hide";
    answers.textLayoutFlexible = false;

    const labels = buildAssistedCreationAnswerDisplayRows(answers).map((row) => row.label);

    assert.ok(!labels.includes("Exact text"));
    assert.ok(!labels.includes("Capitalization notes"));
    assert.ok(!labels.includes("Text layout"));
  });

  it("normalizes mood chip draft encoding for display", () => {
    const answers = createEmptyAssistedCreationAnswers();
    answers.mood = "playful, heartfelt, , Playful";

    const byLabel = Object.fromEntries(
      buildAssistedCreationAnswerDisplayRows(answers).map((row) => [row.label, row.value]),
    );

    assert.equal(byLabel.Mood, "playful, heartfelt");
  });
});
