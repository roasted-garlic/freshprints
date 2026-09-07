import {
  SEMANTIC_REVIEW_DECISIONS,
  SEMANTIC_REVIEW_PATCHABLE_FIELDS,
} from "../../../packages/shared/src/types/catalog/semanticReview.types";

export const SEMANTIC_REVIEW_RESPONSE_SCHEMA_NAME =
  "catalog_semantic_review_v4" as const;

const SEMANTIC_REVIEW_PATCH_PROPERTIES = Object.fromEntries(
  SEMANTIC_REVIEW_PATCHABLE_FIELDS.map((field) => [
    field,
    { type: "array", items: { type: "string" } },
  ]),
) as Record<
  (typeof SEMANTIC_REVIEW_PATCHABLE_FIELDS)[number],
  { type: "array"; items: { type: "string" } }
>;

/**
 * Provider-neutral Semantic Review schema.
 *
 * Keep this aligned with the JSON Schema subset already used by the Pass 1
 * Gemini/OpenAI-compatible request. Patch maps are intentional: the server
 * derives each patch's source from the current immutable profile before the
 * existing stale/no-op/protected-field validation runs.
 */
export const SEMANTIC_REVIEW_RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    decision: {
      type: "string",
      enum: [...SEMANTIC_REVIEW_DECISIONS],
    },
    reason: { type: "string", minLength: 1 },
    blockersResolved: { type: "array", items: { type: "string" } },
    blockersUnresolved: { type: "array", items: { type: "string" } },
    patches: {
      type: "object",
      additionalProperties: false,
      properties: SEMANTIC_REVIEW_PATCH_PROPERTIES,
    },
  },
  required: [
    "decision",
    "reason",
    "blockersResolved",
    "blockersUnresolved",
  ],
} as const;

export function buildSemanticReviewResponseFormat(): Record<
  string,
  unknown
> {
  return {
    type: "json_schema",
    json_schema: {
      name: SEMANTIC_REVIEW_RESPONSE_SCHEMA_NAME,
      strict: true,
      schema: SEMANTIC_REVIEW_RESPONSE_SCHEMA,
    },
  };
}
