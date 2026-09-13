import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const playgroundHook = readFileSync(
  new URL("../hooks/useAiEnrichmentPlayground.ts", import.meta.url),
  "utf8",
);
const callableImage = readFileSync(
  new URL("./aiPlaygroundCallableImage.ts", import.meta.url),
  "utf8",
);

describe("Playground large-image callable prep contract", () => {
  it("prepares callable images through encoded-size-aware analysis derivative helper", () => {
    assert.match(playgroundHook, /preparePlaygroundCallableImage/);
    assert.match(callableImage, /AI_ENRICHMENT_PLAYGROUND_SAFE_ENCODED_IMAGE_BYTES/);
    assert.match(callableImage, /createPlaygroundAiAnalysisDerivative/);
    assert.match(callableImage, /usedAnalysisDerivative/);
    assert.match(callableImage, /AI_ANALYSIS_CANVAS_SIZE_PX/);
    assert.doesNotMatch(
      callableImage,
      /source\.arrayBuffer\(\)[\s\S]*source\.name\s*=/,
    );
  });
});
