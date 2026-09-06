import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ARTWORK_BACKGROUND_PRESET_LIGHT_BLACK } from "../constants/design/artworkBackground.constants";
import {
  applyCustomerUploadArtworkBackgroundDetectionToReadyPatch,
  buildCustomerUploadArtworkBackgroundDetectionFields,
} from "./customerUploadArtworkBackgroundDetection";

describe("buildCustomerUploadArtworkBackgroundDetectionFields", () => {
  it("writes code_auto dark when suggestDark is true", () => {
    assert.deepEqual(buildCustomerUploadArtworkBackgroundDetectionFields(true), {
      suggestDarkArtworkBackground: true,
      artworkBackgroundHex: ARTWORK_BACKGROUND_PRESET_LIGHT_BLACK,
      artworkBackgroundSource: "code_auto",
    });
  });

  it("clears hint and code_auto when suggestDark is false", () => {
    assert.deepEqual(buildCustomerUploadArtworkBackgroundDetectionFields(false), {
      suggestDarkArtworkBackground: null,
      artworkBackgroundHex: null,
      artworkBackgroundSource: null,
    });
  });
});

describe("applyCustomerUploadArtworkBackgroundDetectionToReadyPatch", () => {
  it("preserves staff_manual hex/source while refreshing the hint", () => {
    const patch: Record<string, unknown> = {
      technicalStatus: "ready",
      artworkBackgroundHex: "#ffffff",
      artworkBackgroundSource: "staff_manual",
    };
    applyCustomerUploadArtworkBackgroundDetectionToReadyPatch(patch, {
      suggestDark: true,
      existingArtworkBackgroundSource: "staff_manual",
    });
    assert.equal(patch.suggestDarkArtworkBackground, true);
    assert.equal(patch.artworkBackgroundHex, "#ffffff");
    assert.equal(patch.artworkBackgroundSource, "staff_manual");
  });

  it("applies code_auto when staff_manual is absent", () => {
    const patch: Record<string, unknown> = { technicalStatus: "ready" };
    applyCustomerUploadArtworkBackgroundDetectionToReadyPatch(patch, {
      suggestDark: true,
      existingArtworkBackgroundSource: null,
    });
    assert.equal(patch.suggestDarkArtworkBackground, true);
    assert.equal(patch.artworkBackgroundHex, ARTWORK_BACKGROUND_PRESET_LIGHT_BLACK);
    assert.equal(patch.artworkBackgroundSource, "code_auto");
  });
});
