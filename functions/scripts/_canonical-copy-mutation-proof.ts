/**
 * Local proof: Processing persistence no longer semantically mutates cucumber-class titles.
 *   npx tsx functions/scripts/_canonical-copy-mutation-proof.ts
 */
import assert from "node:assert/strict";
import {
  buildSimpleCatalogEnrichmentResult,
  normalizeSimpleCatalogEnrichment,
} from "../src/ai/simpleCatalogEnrichmentResponse";
import type { AiEnrichmentInput } from "../src/ai/providers/AiEnrichmentProvider";

const cases = [
  {
    title: "Retro Pin-Up Woman Holding Cucumber",
    description:
      "A vintage pin-up woman holds a cucumber. The slogan reads WHEN LIFE GIVES YOU CUCUMBERS GO FUCK YOURSELF.",
  },
  {
    title: "When Life Gives You Cucumbers Go Fuck Yourself Woman",
    description: "A retro art style with distressed texture and prominent slogan text.",
  },
  {
    title: "Pin-up Woman Holding Cucumber Sarcastic Saying",
    description: 'A pin-up holds a cucumber. Text: "GO FUCK YOURSELF..."',
  },
];

const enrichmentInput: AiEnrichmentInput = {
  designId: "Y2IQuCgAPgnqrBIeJuap",
  previewPath: "previews/Y2IQuCgAPgnqrBIeJuap.webp",
  uploadFileStem: "upload",
  categoryNames: ["Funny & Sarcastic"],
  categoryIdsByName: { "funny & sarcastic": "funny" },
  approvedTags: [],
};

for (const c of cases) {
  const parsed = normalizeSimpleCatalogEnrichment(
    {
      category: "Funny & Sarcastic",
      title: c.title,
      description: c.description,
      tags: [],
      readableTextLines: ["WHEN LIFE GIVES YOU", "CUCUMBERS", "GO FUCK YOURSELF"],
      centralSubject: "woman",
      subjects: ["woman", "cucumber"],
      objects: ["cucumber"],
    },
    [],
  );
  const result = buildSimpleCatalogEnrichmentResult({
    parsed,
    enrichmentInput,
    modelId: "gemini-2.5-flash-lite",
  });
  const titleMutation = result.suggestions.title !== c.title;
  const descMutation = result.suggestions.description !== c.description;
  console.log(
    JSON.stringify(
      {
        aiTitle: c.title,
        finalTitle: result.suggestions.title,
        titleSemanticMutation: titleMutation ? "YES" : "NO",
        aiDescription: c.description,
        finalDescription: result.suggestions.description,
        descriptionSemanticMutation: descMutation ? "YES" : "NO",
      },
      null,
      2,
    ),
  );
  assert.equal(titleMutation, false);
  assert.equal(descMutation, false);
}

console.log("All cucumber-class cases: TITLE/DESCRIPTION SEMANTIC MUTATION NO");
