import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildSimpleCatalogEnrichmentResponseFormat,
  SIMPLE_CATALOG_ENRICHMENT_SCHEMA,
  SIMPLE_CATALOG_ENRICHMENT_SCHEMA_NAME,
} from "./simpleCatalogEnrichmentSchema";

describe("simple catalog enrichment provider schema", () => {
  it("requires the canonical catalog fields and genuine visual context", () => {
    assert.deepEqual(SIMPLE_CATALOG_ENRICHMENT_SCHEMA.required, [
      "title",
      "description",
      "category",
      "visualContextProfile",
    ]);
    assert.equal("tags" in SIMPLE_CATALOG_ENRICHMENT_SCHEMA.properties, false);
    assert.equal(
      "suggestedNewTags" in SIMPLE_CATALOG_ENRICHMENT_SCHEMA.properties,
      false,
    );
    assert.equal(
      "readableTextLines" in SIMPLE_CATALOG_ENRICHMENT_SCHEMA.properties,
      false,
    );
    assert.equal(
      "halftoneShadowLikelihood" in SIMPLE_CATALOG_ENRICHMENT_SCHEMA.properties,
      false,
    );
    assert.equal(
      "halftoneShadowEvidence" in SIMPLE_CATALOG_ENRICHMENT_SCHEMA.properties,
      false,
    );

    const schemaJson = JSON.stringify(SIMPLE_CATALOG_ENRICHMENT_SCHEMA);
    assert.equal((schemaJson.match(/"maxItems"/g) ?? []).length, 0);
    const vcp =
      SIMPLE_CATALOG_ENRICHMENT_SCHEMA.properties.visualContextProfile;
    assert.deepEqual(vcp.required, [
      "version",
      "summary",
      "detailedDescription",
    ]);
    assert.deepEqual(vcp.properties.version.enum, ["visual-context-v1"]);
  });

  it("uses one strict OpenAI-compatible response-format envelope", () => {
    assert.deepEqual(buildSimpleCatalogEnrichmentResponseFormat(), {
      type: "json_schema",
      json_schema: {
        name: SIMPLE_CATALOG_ENRICHMENT_SCHEMA_NAME,
        strict: true,
        schema: SIMPLE_CATALOG_ENRICHMENT_SCHEMA,
      },
    });
  });
});
