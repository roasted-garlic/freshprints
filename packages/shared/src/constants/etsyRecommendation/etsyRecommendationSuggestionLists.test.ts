import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  collectSubjectCollisionKeys,
  getStaticStyleCollisionKeys,
  getStaticSubjectCollisionKeys,
  mergeStyleSuggestionLabels,
  mergeSubjectSuggestEntries,
  normalizeSuggestionLabelKey,
  parseSuggestionAliases,
  type AdminSuggestionOverlay,
} from "./etsyRecommendationSuggestionLists";

describe("normalizeSuggestionLabelKey", () => {
  it("lowercases and collapses whitespace", () => {
    assert.equal(normalizeSuggestionLabelKey("  Funny   Tone "), "funny tone");
  });
});

describe("mergeSubjectSuggestEntries", () => {
  it("appends active subject overlays", () => {
    const overlays: AdminSuggestionOverlay[] = [
      {
        id: "1",
        kind: "subject",
        label: "Whimsical Fox",
        apiToken: "whimsical fox",
        active: true,
        labelKey: "whimsical fox",
      },
      {
        id: "2",
        kind: "subject",
        label: "Inactive",
        apiToken: "inactive",
        active: false,
        labelKey: "inactive",
      },
      {
        id: "3",
        kind: "style",
        label: "Quirky",
        apiToken: "Quirky",
        active: true,
        labelKey: "quirky",
      },
    ];
    const merged = mergeSubjectSuggestEntries(overlays);
    assert.ok(merged.some((entry) => entry.id === "admin_1"));
    assert.ok(!merged.some((entry) => entry.id === "admin_2"));
    assert.ok(!merged.some((entry) => entry.id === "admin_3"));
  });
});

describe("mergeStyleSuggestionLabels", () => {
  it("appends active style overlays without duplicating static", () => {
    const overlays: AdminSuggestionOverlay[] = [
      {
        id: "a",
        kind: "style",
        label: "Whimsical",
        apiToken: "Whimsical",
        active: true,
        labelKey: "whimsical",
      },
      {
        id: "b",
        kind: "style",
        label: "funny",
        apiToken: "funny",
        active: true,
        labelKey: "funny",
      },
    ];
    const merged = mergeStyleSuggestionLabels(overlays);
    assert.ok(merged.includes("Whimsical"));
    assert.equal(merged.filter((label) => normalizeSuggestionLabelKey(label) === "funny").length, 1);
  });
});

describe("static collision keys", () => {
  it("includes known static subject and style keys", () => {
    assert.ok(getStaticSubjectCollisionKeys().has("highland cow"));
    assert.ok(getStaticStyleCollisionKeys().has("funny"));
  });
});

describe("collectSubjectCollisionKeys", () => {
  it("includes label, token, and aliases", () => {
    const keys = collectSubjectCollisionKeys({
      label: "Trash Panda",
      apiToken: "raccoon",
      aliases: ["racoon"],
    });
    assert.ok(keys.has("trash panda"));
    assert.ok(keys.has("raccoon"));
    assert.ok(keys.has("racoon"));
  });
});

describe("parseSuggestionAliases", () => {
  it("rejects oversized lists and control characters", () => {
    assert.ok(parseSuggestionAliases(["ok"]).aliases.includes("ok"));
    assert.ok(parseSuggestionAliases(Array.from({ length: 11 }, (_, i) => `a${i}`)).error);
    assert.ok(parseSuggestionAliases(["bad\u0000"]).error);
  });
});
