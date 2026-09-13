/**
 * Provider-neutral JSON Schema for the simple catalog enrichment response.
 *
 * Keep this limited to the JSON Schema subset accepted by Gemini's
 * OpenAI-compatible structured-output surface: objects, arrays, strings, enums,
 * required, additionalProperties, and scalar bounds.
 */
export const SIMPLE_CATALOG_ENRICHMENT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    category: { type: "string" },
    centralSubject: { type: "string" },
    subjects: { type: "array", items: { type: "string" } },
    objects: { type: "array", items: { type: "string" } },
    styles: { type: "array", items: { type: "string" } },
    themes: { type: "array", items: { type: "string" } },
    interests: { type: "array", items: { type: "string" } },
    professionsGroups: { type: "array", items: { type: "string" } },
    occasions: { type: "array", items: { type: "string" } },
    places: { type: "array", items: { type: "string" } },
    colors: { type: "array", items: { type: "string" } },
    visibleText: { type: "array", items: { type: "string" } },
    searchConcepts: { type: "array", items: { type: "string" } },
    categoryAlternatives: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          reason: { type: "string" },
        },
        required: ["name"],
      },
    },
    categoryGapNote: { type: "string" },
    visualContextProfile: {
      type: "object",
      additionalProperties: false,
      properties: {
        version: { type: "string", enum: ["visual-context-v1"] },
        summary: { type: "string" },
        detailedDescription: { type: "string" },
        peopleCharacters: { type: "array", items: { type: "string" } },
        animals: { type: "array", items: { type: "string" } },
        objects: { type: "array", items: { type: "string" } },
        appearance: { type: "string" },
        posesActions: { type: "string" },
        relationships: { type: "string" },
        readableArtworkText: { type: "array", items: { type: "string" } },
        symbols: { type: "array", items: { type: "string" } },
        setting: { type: "string" },
        styleComposition: { type: "string" },
        colors: { type: "array", items: { type: "string" } },
        themesInterests: { type: "array", items: { type: "string" } },
        professionsGroups: { type: "array", items: { type: "string" } },
        occasions: { type: "array", items: { type: "string" } },
        visualJokeOrStory: { type: "string" },
        semanticAliases: { type: "array", items: { type: "string" } },
        uncertainties: { type: "array", items: { type: "string" } },
      },
      required: ["version", "summary", "detailedDescription"],
    },
  },
  required: ["title", "description", "category", "visualContextProfile"],
} as const;

export const SIMPLE_CATALOG_ENRICHMENT_SCHEMA_NAME =
  "catalog_enrichment" as const;

export function buildSimpleCatalogEnrichmentResponseFormat(): Record<
  string,
  unknown
> {
  return {
    type: "json_schema",
    json_schema: {
      name: SIMPLE_CATALOG_ENRICHMENT_SCHEMA_NAME,
      strict: true,
      schema: SIMPLE_CATALOG_ENRICHMENT_SCHEMA,
    },
  };
}
