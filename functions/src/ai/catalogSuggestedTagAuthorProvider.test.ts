import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { CatalogTag } from "../../../packages/shared/src/types/catalogTag.types";
import {
  buildSuggestedTagAuthorInstructions,
  buildSuggestedTagAuthorRequestBody,
  selectCalibrationExampleTags,
  validateAuthoredSuggestions,
} from "./catalogSuggestedTagAuthorProvider";

function createCatalogTag(input: Partial<CatalogTag> & Pick<CatalogTag, "name">): CatalogTag {
  return {
    aliases: input.aliases ?? [],
    createdAt: null,
    createdBy: "owner-1",
    id: input.id ?? input.name,
    name: input.name,
    preferredWhen: input.preferredWhen ?? "Use when relevant.",
    status: input.status ?? "approved",
    updatedAt: null,
    updatedBy: "owner-1",
  };
}

describe("catalogSuggestedTagAuthorProvider — request shape", () => {
  it("builds a text-only request body with no image_url content part", () => {
    const body = JSON.parse(
      buildSuggestedTagAuthorRequestBody("gemini-2.5-flash-lite", "prompt text", 700),
    ) as {
      messages: Array<{ role: string; content: unknown }>;
    };

    const userMessage = body.messages.find((message) => message.role === "user");
    assert.ok(userMessage);
    assert.equal(typeof userMessage.content, "string", "user content must be a plain string, no image_url part");
    assert.ok(!JSON.stringify(body).includes("image_url"), "request body must never contain image_url");
  });
});

describe("catalogSuggestedTagAuthorProvider — buildSuggestedTagAuthorInstructions", () => {
  it("never includes the full approved tag database, only the calibration example set", () => {
    const instructions = buildSuggestedTagAuthorInstructions({
      approvedMatchedTags: ["summer"],
      candidateNames: ["skateboard"],
      exampleApprovedTags: [{ aliases: ["board"], name: "skate", preferredWhen: "Use when skating is shown." }],
      firstResponse: { category: "Sports", description: "A skater doing a trick.", title: "Skate Trick" },
    });

    assert.ok(instructions.includes("skateboard"), "must include the candidate list");
    assert.ok(instructions.includes("skate"), "must include the calibration example");
    assert.ok(!instructions.includes("summer"), "approvedMatchedTags is not part of the shared instructions block");
  });
});

describe("catalogSuggestedTagAuthorProvider — selectCalibrationExampleTags", () => {
  it("is deterministic for the same input", () => {
    const approvedTags = [
      createCatalogTag({ aliases: ["a", "b"], name: "alpha", preferredWhen: "Use when alpha is the main subject." }),
      createCatalogTag({ aliases: ["c", "d"], name: "beta", preferredWhen: "Use when beta is the main subject." }),
      createCatalogTag({ aliases: ["e", "f"], name: "gamma", preferredWhen: "Use when gamma is the main subject." }),
    ];
    const context = { candidateNames: ["delta"], matchedTagNames: ["alpha"] };

    const first = selectCalibrationExampleTags(approvedTags, context);
    const second = selectCalibrationExampleTags(approvedTags, context);

    assert.deepEqual(first, second);
  });

  it("caps at 4 examples maximum", () => {
    const approvedTags = Array.from({ length: 10 }, (_unused, index) =>
      createCatalogTag({
        aliases: [`alias${index}a`, `alias${index}b`],
        name: `tag${index}`,
        preferredWhen: `Use when tag${index} is clearly the primary subject of the design.`,
      }),
    );

    const result = selectCalibrationExampleTags(approvedTags, { candidateNames: [], matchedTagNames: [] });

    assert.ok(result.length <= 4);
  });

  it("caps each example to name, up to 8 aliases, and preferredWhen only", () => {
    const approvedTags = [
      createCatalogTag({
        aliases: ["a1", "a2", "a3", "a4", "a5", "a6", "a7", "a8", "a9", "a10"],
        name: "richtag",
        preferredWhen: "Use when richtag is clearly the primary subject of the design.",
      }),
    ];

    const [example] = selectCalibrationExampleTags(approvedTags, { candidateNames: [], matchedTagNames: [] });

    assert.ok(example);
    assert.equal(example.aliases.length, 8);
    assert.deepEqual(Object.keys(example).sort(), ["aliases", "name", "preferredWhen"]);
  });

  it("prefers relevant + high-quality tags over unrelated high-quality tags", () => {
    const relevant = createCatalogTag({
      aliases: ["relalias1", "relalias2"],
      name: "skateboard",
      preferredWhen: "Use when a skateboard or skating trick is the primary visual subject.",
    });
    const unrelated = createCatalogTag({
      aliases: ["unrelalias1", "unrelalias2"],
      name: "campfire",
      preferredWhen: "Use when a campfire or camping scene is the primary visual subject.",
    });

    const result = selectCalibrationExampleTags(
      [unrelated, relevant],
      { candidateNames: ["skate trick"], matchedTagNames: [] },
      1,
    );

    assert.deepEqual(
      result.map((tag) => tag.name),
      ["skateboard"],
    );
  });

  it("falls back to filling remaining slots from high-quality tags when too few relevant tags exist", () => {
    const approvedTags = [
      createCatalogTag({
        aliases: ["hqa", "hqb"],
        name: "highquality",
        preferredWhen: "Use when this concept is clearly the primary visual subject of the design.",
      }),
      createCatalogTag({ aliases: [], name: "lowquality", preferredWhen: "x" }),
    ];

    const result = selectCalibrationExampleTags(approvedTags, {
      candidateNames: ["totally-unrelated-concept"],
      matchedTagNames: [],
    });

    assert.deepEqual(
      result.map((tag) => tag.name),
      ["highquality"],
    );
  });

  it("excludes archived tags", () => {
    const approvedTags = [
      createCatalogTag({
        aliases: ["a", "b"],
        name: "archivedtag",
        preferredWhen: "Use when this is clearly the primary subject.",
        status: "archived",
      }),
    ];

    const result = selectCalibrationExampleTags(approvedTags, { candidateNames: [], matchedTagNames: [] });

    assert.deepEqual(result, []);
  });

  it("breaks ties alphabetically for stable ordering", () => {
    const approvedTags = [
      createCatalogTag({ aliases: ["a", "b"], name: "zebra", preferredWhen: "Use when zebra is the subject." }),
      createCatalogTag({ aliases: ["c", "d"], name: "apple", preferredWhen: "Use when apple is the subject." }),
    ];

    const result = selectCalibrationExampleTags(approvedTags, { candidateNames: [], matchedTagNames: [] });

    assert.deepEqual(
      result.map((tag) => tag.name),
      ["apple", "zebra"],
    );
  });
});

describe("catalogSuggestedTagAuthorProvider — validateAuthoredSuggestions", () => {
  it("keeps only suggestions whose name matches an original candidate", () => {
    const result = validateAuthoredSuggestions(
      [
        { aliases: ["board"], name: "skateboard", preferredWhen: "Use when a skateboard is the primary subject." },
        { aliases: [], name: "invented", preferredWhen: "Use when invented is relevant." },
      ],
      ["skateboard"],
    );

    assert.deepEqual(
      result.map((entry) => entry.name),
      ["skateboard"],
    );
  });

  it("drops a suggestion missing a usable preferredWhen", () => {
    const result = validateAuthoredSuggestions(
      [{ aliases: [], name: "skateboard", preferredWhen: "" }],
      ["skateboard"],
    );

    assert.deepEqual(result, []);
  });

  it("caps aliases at 12, dedupes, and drops an alias equal to the name", () => {
    const result = validateAuthoredSuggestions(
      [
        {
          aliases: [
            "a",
            "a",
            "b",
            "c",
            "d",
            "e",
            "f",
            "g",
            "h",
            "i",
            "j",
            "k",
            "l",
            "m",
            "skateboard",
          ],
          name: "skateboard",
          preferredWhen: "Use when a skateboard is the primary subject.",
        },
      ],
      ["skateboard"],
    );

    assert.equal(result[0]?.aliases.length, 12);
    assert.ok(!result[0]?.aliases.includes("skateboard"));
  });

  it("strips aliases and drops names that collide with reserved catalog terms", () => {
    const result = validateAuthoredSuggestions(
      [
        {
          aliases: ["scrollwork", "parchment", "rolled document"],
          name: "scroll",
          preferredWhen: "Use when a scroll is the main visual element.",
        },
        {
          aliases: ["bone"],
          name: "skeleton",
          preferredWhen: "Use when a skeleton is shown.",
        },
      ],
      ["scroll", "skeleton"],
      ["parchment", "skeleton"],
    );

    assert.deepEqual(
      result.map((entry) => ({ name: entry.name, aliases: entry.aliases })),
      [{ name: "scroll", aliases: ["scrollwork", "rolled document"] }],
    );
  });

  it("handles non-array input safely", () => {
    assert.deepEqual(validateAuthoredSuggestions("not-an-array", ["skateboard"]), []);
    assert.deepEqual(validateAuthoredSuggestions(undefined, ["skateboard"]), []);
  });

  it("drops a suggestion whose name contains a space or slash", () => {
    const result = validateAuthoredSuggestions(
      [{ aliases: [], name: "skate board", preferredWhen: "Use when relevant." }],
      ["skate board"],
    );

    assert.deepEqual(result, []);
  });

  it("truncates preferredWhen to the max length", () => {
    const longText = "x".repeat(800);
    const result = validateAuthoredSuggestions(
      [{ aliases: [], name: "skateboard", preferredWhen: longText }],
      ["skateboard"],
    );

    assert.ok((result[0]?.preferredWhen.length ?? 0) <= 500);
  });
});
