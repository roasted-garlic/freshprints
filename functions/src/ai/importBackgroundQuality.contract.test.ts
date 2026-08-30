import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  shouldPreferDarkArtworkMatFromPixelStats,
} from "../../../packages/shared/src/utils/importArtworkBackgroundDetection";
import {
  buildImportDesignBackgroundAndHalftoneFields,
  resolveImportArtworkBackgroundDecision,
} from "../../../packages/shared/src/utils/resolveImportArtworkBackgroundDecision";
import { ARTWORK_BACKGROUND_PRESET_LIGHT_BLACK } from "../../../packages/shared/src/constants/design/artworkBackground.constants";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "../../..");

describe("import bg/halftone quality contract extras", () => {
  it("dark-only background does not set halftone", () => {
    const fields = buildImportDesignBackgroundAndHalftoneFields({
      backgroundMode: "all_dark",
      halftoneMode: "normal",
      autoSuggestsDark: false,
      callerId: "staff-1",
    });
    assert.equal(fields.artworkBackgroundHex, ARTWORK_BACKGROUND_PRESET_LIGHT_BLACK);
    assert.equal(fields.halftoneStaffDecision, undefined);
    assert.equal(fields.halftoneDecisionSource, undefined);
  });

  it("all-halftone sets staff authority and dark default when auto bg", () => {
    const fields = buildImportDesignBackgroundAndHalftoneFields({
      backgroundMode: "auto",
      halftoneMode: "all_halftones",
      autoSuggestsDark: false,
      callerId: "staff-1",
    });
    assert.equal(fields.artworkBackgroundHex, ARTWORK_BACKGROUND_PRESET_LIGHT_BLACK);
    assert.equal(fields.artworkBackgroundSource, "import_halftone_default");
    assert.equal(fields.halftoneStaffDecision?.value, true);
    assert.equal(fields.halftoneDecisionSource, "import_batch");
  });

  it("explicit light override wins over all-halftone dark default for background", () => {
    const decision = resolveImportArtworkBackgroundDecision({
      backgroundMode: "all_light",
      halftoneMode: "all_halftones",
      autoSuggestsDark: true,
    });
    assert.equal(decision.hex, null);
    assert.equal(decision.source, "import_override");
  });

  it("sparse/transparent artwork stays conservative (no dark)", () => {
    assert.equal(
      shouldPreferDarkArtworkMatFromPixelStats({
        opaquePixelCount: 20,
        sparseRatio: 0.002,
        lightOpaqueRatio: 0.99,
        meanLuma: 0.95,
      }),
      false,
    );
  });

  it("AI Review / catalog halftone surfaces remain and no second AI bg call in prepareAiAnalysisImage", () => {
    const aiReview = readFileSync(
      join(
        repoRoot,
        "apps/studio/src/renderer/src/features/ai-review/components/AiReviewFormPanel.tsx",
      ),
      "utf8",
    );
    assert.match(aiReview, /halftone|Halftone/);

    const prepare = readFileSync(
      join(repoRoot, "functions/src/ai/prepareAiAnalysisImage.ts"),
      "utf8",
    );
    assert.doesNotMatch(prepare, /enrichDesign|vision\.|generateContent/);
  });
});
