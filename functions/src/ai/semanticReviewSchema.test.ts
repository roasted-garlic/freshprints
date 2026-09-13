import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildSemanticReviewResponseFormat,
  SEMANTIC_REVIEW_RESPONSE_SCHEMA,
  SEMANTIC_REVIEW_RESPONSE_SCHEMA_NAME,
} from "./semanticReviewSchema";
import { SEMANTIC_REVIEW_PATCHABLE_FIELDS } from "../../../packages/shared/src/types/catalog/semanticReview.types";

describe("semantic review provider schema", () => {
  it("uses the strict v4 OpenAI-compatible response-format envelope", () => {
    assert.deepEqual(buildSemanticReviewResponseFormat(), {
      type: "json_schema",
      json_schema: {
        name: SEMANTIC_REVIEW_RESPONSE_SCHEMA_NAME,
        strict: true,
        schema: SEMANTIC_REVIEW_RESPONSE_SCHEMA,
      },
    });
    assert.equal(SEMANTIC_REVIEW_RESPONSE_SCHEMA_NAME, "catalog_semantic_review_v4");
  });

  it("requires the decision, non-empty reason, and blocker arrays", () => {
    assert.equal(SEMANTIC_REVIEW_RESPONSE_SCHEMA.type, "object");
    assert.equal(SEMANTIC_REVIEW_RESPONSE_SCHEMA.additionalProperties, false);
    assert.deepEqual(SEMANTIC_REVIEW_RESPONSE_SCHEMA.required, [
      "decision",
      "reason",
      "blockersResolved",
      "blockersUnresolved",
    ]);
    assert.deepEqual(
      SEMANTIC_REVIEW_RESPONSE_SCHEMA.properties.decision.enum,
      ["APPROVE", "APPROVE_WITH_PATCH", "NEEDS_REVIEW"],
    );
    assert.equal(SEMANTIC_REVIEW_RESPONSE_SCHEMA.properties.reason.minLength, 1);
    assert.deepEqual(SEMANTIC_REVIEW_RESPONSE_SCHEMA.properties.blockersResolved, {
      type: "array",
      items: { type: "string" },
    });
    assert.deepEqual(SEMANTIC_REVIEW_RESPONSE_SCHEMA.properties.blockersUnresolved, {
      type: "array",
      items: { type: "string" },
    });
  });

  it("limits patches to a non-additional-properties map of patchable dimensions", () => {
    const patches = SEMANTIC_REVIEW_RESPONSE_SCHEMA.properties.patches;
    assert.equal(patches.type, "object");
    assert.equal(patches.additionalProperties, false);
    assert.deepEqual(Object.keys(patches.properties), [...SEMANTIC_REVIEW_PATCHABLE_FIELDS]);
    for (const field of SEMANTIC_REVIEW_PATCHABLE_FIELDS) {
      assert.deepEqual(patches.properties[field], {
        type: "array",
        items: { type: "string" },
      });
    }
    for (const forbidden of [
      "title",
      "description",
      "category",
      "visibleText",
      "staffOwned",
      "from",
      "to",
      "image",
    ]) {
      assert.equal(forbidden in patches.properties, false);
    }
  });
});
