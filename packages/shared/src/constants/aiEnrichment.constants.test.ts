import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { AI_ENRICHMENT_STALE_STAGE_MS } from "../constants/aiEnrichment.constants";

describe("aiEnrichment.constants stale threshold", () => {
  it("matches the authoritative 10-minute server stale window", () => {
    assert.equal(AI_ENRICHMENT_STALE_STAGE_MS, 10 * 60 * 1000);
    assert.equal(AI_ENRICHMENT_STALE_STAGE_MS, 600_000);
  });
});
