import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

describe("Studio Add-to-Show post-queue reconcile", () => {
  it("patches queueTab and allocation totals before routing to Queued", () => {
    const pageSource = readFileSync(join(here, "pages/PrintRequestsPage.tsx"), "utf8");
    const start = pageSource.indexOf("const handleAddedToShow = useCallback");
    assert.ok(start >= 0, "handleAddedToShow must exist");
    const end = pageSource.indexOf("const reconcileAddToShowFailure", start);
    assert.ok(end > start, "reconcileAddToShowFailure must follow handleAddedToShow");
    const body = pageSource.slice(start, end);
    assert.match(body, /patchAllocationTotalsLocally/);
    assert.match(body, /queueTab:\s*"queued"/);
    assert.match(body, /status:\s*"active"/);
    assert.match(body, /refreshAllocationHydration\(\)/);
    assert.doesNotMatch(body, /clearPrintRequestsPageCache\(\)/);
    assert.doesNotMatch(body, /reloadPrintRequests/);
  });

  it("passes allocate totals into onAdded", () => {
    const modalSource = readFileSync(join(here, "components/AddToShowModal.tsx"), "utf8");
    assert.match(modalSource, /totalAllocatedQuantity:\s*allocateResult\.totalAllocatedQuantity/);
  });
});
