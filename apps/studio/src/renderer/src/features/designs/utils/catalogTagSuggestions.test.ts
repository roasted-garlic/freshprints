import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { CatalogTag } from "../types/catalogTag.types";
import { buildCatalogTagSuggestions } from "./catalogTagSuggestions";

function tag(input: Partial<CatalogTag> & Pick<CatalogTag, "name">): CatalogTag {
  return {
    aliases: input.aliases ?? [],
    createdAt: null,
    createdBy: "owner",
    id: input.id ?? input.name,
    name: input.name,
    preferredWhen: input.preferredWhen ?? "Use when relevant.",
    status: input.status ?? "approved",
    ...(input.isFeatured === true ? { isFeatured: true } : {}),
    updatedAt: null,
    updatedBy: "owner",
  };
}

describe("buildCatalogTagSuggestions", () => {
  const approvedTags = [
    tag({ name: "music", aliases: ["rock and roll", "rock n roll"] }),
    tag({ name: "mom", aliases: ["mama", "mother"] }),
    tag({ name: "funny", aliases: ["humor"] }),
    tag({ name: "retired", status: "archived", aliases: ["retro"] }),
  ];

  it("matches by tag name and ranks prefix matches first", () => {
    const suggestions = buildCatalogTagSuggestions("mo", approvedTags);

    assert.equal(suggestions[0]?.name, "mom");
    assert.ok(suggestions.some((suggestion) => suggestion.name === "mom"));
  });

  it("matches aliases and reports the canonical tag name plus matched alias", () => {
    const suggestions = buildCatalogTagSuggestions("rock", approvedTags);

    const musicMatch = suggestions.find((suggestion) => suggestion.name === "music");
    assert.ok(musicMatch, "expected the music tag via its alias");
    assert.equal(musicMatch?.matchedAlias, "rock and roll");
  });

  it("excludes tags already selected", () => {
    const suggestions = buildCatalogTagSuggestions("", approvedTags, ["mom"]);

    assert.ok(!suggestions.some((suggestion) => suggestion.name === "mom"));
  });

  it("ignores archived tags entirely", () => {
    const byName = buildCatalogTagSuggestions("retired", approvedTags);
    const byAlias = buildCatalogTagSuggestions("retro", approvedTags);

    assert.deepEqual(byName, []);
    assert.deepEqual(byAlias, []);
  });

  it("returns all approved tags for an empty query", () => {
    const suggestions = buildCatalogTagSuggestions("", approvedTags);

    assert.deepEqual(
      suggestions.map((suggestion) => suggestion.name).sort(),
      ["funny", "mom", "music"],
    );
  });

  it("ranks featured tags first for an empty query so they appear in the capped suggestion list", () => {
    const manyTags = [
      tag({ name: "alpha" }),
      tag({ name: "bravo" }),
      tag({ name: "charlie" }),
      tag({ name: "delta" }),
      tag({ name: "echo" }),
      tag({ name: "foxtrot" }),
      tag({ name: "golf" }),
      tag({ name: "hotel" }),
      tag({ name: "india" }),
      tag({ name: "zebra-featured", isFeatured: true }),
    ];

    const suggestions = buildCatalogTagSuggestions("", manyTags);
    assert.equal(suggestions[0]?.name, "zebra-featured");
    assert.ok(suggestions.some((suggestion) => suggestion.name === "zebra-featured"));
  });
});
