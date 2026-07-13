import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatImageUpscaledSoftQualityMessage } from "./importPrintSizeMessages";

describe("formatImageUpscaledSoftQualityMessage", () => {
  it("includes rounded scale factor and soft-print guidance", () => {
    const message = formatImageUpscaledSoftQualityMessage(3.75);

    assert.match(message, /3\.8×/);
    assert.match(message, /may look soft/i);
    assert.match(message, /prefer smaller prints/i);
  });
});
