import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  AI_ENRICHMENT_PLAYGROUND_GEN2_HTTP_REQUEST_MAX_BYTES,
  AI_ENRICHMENT_PLAYGROUND_SAFE_ENCODED_IMAGE_BYTES,
} from "@fresh-prints/shared/constants/aiEnrichment.constants";
import {
  encodedImageFitsPlaygroundCallableLimit,
  estimateBase64EncodedByteLength,
} from "@fresh-prints/shared/utils/aiEnrichmentPlaygroundImagePayload";

describe("aiEnrichmentPlaygroundImagePayload", () => {
  it("accounts for base64 4/3 expansion with padding", () => {
    assert.equal(estimateBase64EncodedByteLength(0), 0);
    assert.equal(estimateBase64EncodedByteLength(1), 4);
    assert.equal(estimateBase64EncodedByteLength(2), 4);
    assert.equal(estimateBase64EncodedByteLength(3), 4);
    assert.equal(estimateBase64EncodedByteLength(26 * 1024 * 1024), 36_350_636);
  });

  it("rejects a 26 MiB source against the Gen2-safe encoded ceiling", () => {
    const raw = 26 * 1024 * 1024;
    assert.equal(
      estimateBase64EncodedByteLength(raw) >
        AI_ENRICHMENT_PLAYGROUND_SAFE_ENCODED_IMAGE_BYTES,
      true,
    );
    assert.equal(
      encodedImageFitsPlaygroundCallableLimit(
        raw,
        AI_ENRICHMENT_PLAYGROUND_SAFE_ENCODED_IMAGE_BYTES,
      ),
      false,
    );
    assert.ok(
      AI_ENRICHMENT_PLAYGROUND_SAFE_ENCODED_IMAGE_BYTES <
        AI_ENRICHMENT_PLAYGROUND_GEN2_HTTP_REQUEST_MAX_BYTES,
    );
  });

  it("accepts ordinary smaller images", () => {
    assert.equal(
      encodedImageFitsPlaygroundCallableLimit(
        2 * 1024 * 1024,
        AI_ENRICHMENT_PLAYGROUND_SAFE_ENCODED_IMAGE_BYTES,
      ),
      true,
    );
  });
});
