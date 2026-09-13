import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { evaluateContinuablePrintRequestBlockers } from "./customerContinuablePrintRequests";

describe("evaluateContinuablePrintRequestBlockers", () => {
  const request = { id: "pr-1", name: "Draft Request", status: "draft" };

  it("allows when neither customer has continuable requests", () => {
    const result = evaluateContinuablePrintRequestBlockers({
      sourceContinuable: [],
      survivorContinuable: [],
    });
    assert.equal(result.blocked, false);
  });

  it("allows when only survivor has a continuable request", () => {
    const result = evaluateContinuablePrintRequestBlockers({
      sourceContinuable: [],
      survivorContinuable: [request],
    });
    assert.equal(result.blocked, false);
  });

  it("blocks when source has a continuable request", () => {
    const result = evaluateContinuablePrintRequestBlockers({
      sourceContinuable: [request],
      survivorContinuable: [],
    });
    assert.equal(result.blocked, true);
    assert.match(result.blockers[0]?.code ?? "", /source_continuable/);
  });

  it("blocks when both have continuable requests", () => {
    const result = evaluateContinuablePrintRequestBlockers({
      sourceContinuable: [request],
      survivorContinuable: [{ ...request, id: "pr-2" }],
    });
    assert.equal(result.blocked, true);
    assert.ok(result.blockers.some((blocker) => blocker.code === "dual_continuable_print_requests"));
  });
});
