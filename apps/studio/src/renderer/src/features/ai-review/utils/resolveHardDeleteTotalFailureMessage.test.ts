import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveHardDeleteTotalFailureMessage } from "./resolveHardDeleteTotalFailureMessage";

describe("resolveHardDeleteTotalFailureMessage", () => {
  it("uses the first failed item error", () => {
    assert.equal(
      resolveHardDeleteTotalFailureMessage([
        {
          designId: "a",
          status: "failed",
          error: "Referenced by one or more print request items.",
        },
        {
          designId: "b",
          status: "failed",
          error: "Design is linked to a companion set.",
        },
      ]),
      "Referenced by one or more print request items.",
    );
  });

  it("skips failed rows without an error string", () => {
    assert.equal(
      resolveHardDeleteTotalFailureMessage([
        { designId: "a", status: "failed" },
        {
          designId: "b",
          status: "failed",
          error: "  Design is actively mid AI pipeline and cannot be deleted until it settles.  ",
        },
      ]),
      "Design is actively mid AI pipeline and cannot be deleted until it settles.",
    );
  });

  it("falls back when there is no usable failed error", () => {
    assert.equal(
      resolveHardDeleteTotalFailureMessage([]),
      "Unable to permanently delete the selected design(s).",
    );
    assert.equal(
      resolveHardDeleteTotalFailureMessage([{ designId: "a", status: "failed", error: "   " }]),
      "Unable to permanently delete the selected design(s).",
    );
  });
});
