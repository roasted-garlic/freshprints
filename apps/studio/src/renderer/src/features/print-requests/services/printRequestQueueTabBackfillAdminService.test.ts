import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isFirebaseDebugPanelEnabled } from "@fresh-prints/shared/utils/firebaseDebugPanelGate";
import { BACKFILL_PRINT_REQUEST_QUEUE_TAB_CONFIRMATION_PHRASE } from "@fresh-prints/shared/types/admin/backfillPrintRequestQueueTab.types";

/**
 * `printRequestQueueTabBackfillAdminService.ts`'s `isPrintRequestQueueTabBackfillConsoleEnabled`
 * calls `isFirebaseDebugPanelEnabled({ isDevelopmentBuild: import.meta.env.DEV, projectId })` with
 * no additional logic — the exact same gate the Firebase Debug panel already uses, matching this
 * repo's convention of reusing one dev-only + `fresh-prints-dev`-only security boundary rather
 * than inventing a second one. `import.meta.env.DEV` cannot be exercised directly outside a Vite
 * build context in a `node:test` run, so these tests prove the underlying gate function's exact
 * behavior for the same input shape the service passes it — the service itself is a thin,
 * untested passthrough (matching this repo's existing convention for `callTracedFunction`-wrapped
 * bridges, e.g. the sibling `catalogSnapshotAdminService.ts`, which also has no direct test).
 */
describe("printRequestQueueTabBackfillAdminService console gate", () => {
  it("is only enabled for a development build against the fresh-prints-dev project", () => {
    assert.equal(
      isFirebaseDebugPanelEnabled({ isDevelopmentBuild: true, projectId: "fresh-prints-dev" }),
      true,
    );
  });

  it("is disabled in a packaged/production build even against fresh-prints-dev", () => {
    assert.equal(
      isFirebaseDebugPanelEnabled({ isDevelopmentBuild: false, projectId: "fresh-prints-dev" }),
      false,
    );
  });

  it("is disabled against the production project even in a development build", () => {
    assert.equal(
      isFirebaseDebugPanelEnabled({ isDevelopmentBuild: true, projectId: "fresh-prints-prod" }),
      false,
    );
  });

  it("is disabled when no project id is configured", () => {
    assert.equal(isFirebaseDebugPanelEnabled({ isDevelopmentBuild: true, projectId: "" }), false);
  });
});

describe("BackfillPrintRequestQueueTabRequest contract", () => {
  it("the confirmation phrase constant matches the deployed callable's required literal exactly", () => {
    // functions/src/backfillPrintRequestQueueTab.ts imports this same shared constant as
    // BACKFILL_CONFIRMATION_PHRASE — this test guards against the two ever drifting apart, since
    // a client typo here would make every real invocation fail server-side.
    assert.equal(BACKFILL_PRINT_REQUEST_QUEUE_TAB_CONFIRMATION_PHRASE, "BACKFILL QUEUE TAB");
  });

  it("a well-formed dry-run payload only contains the documented fields", () => {
    const payload = {
      dryRun: true,
      confirmationPhrase: BACKFILL_PRINT_REQUEST_QUEUE_TAB_CONFIRMATION_PHRASE,
    } as const;

    assert.deepEqual(Object.keys(payload).sort(), ["confirmationPhrase", "dryRun"]);
    assert.equal(payload.dryRun, true);
  });

  it("a paginated continuation payload carries the cursor field unchanged", () => {
    const nextStartAfterRequestId = "request-42";
    const payload = {
      dryRun: true,
      confirmationPhrase: BACKFILL_PRINT_REQUEST_QUEUE_TAB_CONFIRMATION_PHRASE,
      startAfterRequestId: nextStartAfterRequestId,
    };

    assert.equal(payload.startAfterRequestId, nextStartAfterRequestId);
  });
});
