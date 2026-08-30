import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

describe("portal print request WS1 corrective #4 contracts", () => {
  const contextSource = readFileSync(
    resolve(import.meta.dirname, "context/PortalPrintRequestContext.tsx"),
    "utf8",
  );
  const addFlowSource = readFileSync(
    resolve(import.meta.dirname, "hooks/useAddDesignToRequestFlow.ts"),
    "utf8",
  );
  const detailHookSource = readFileSync(
    resolve(import.meta.dirname, "hooks/usePrintRequestDetail.ts"),
    "utf8",
  );
  const printRequestServiceSource = readFileSync(
    resolve(
      import.meta.dirname,
      "../../../../apps/studio/src/renderer/src/features/print-requests/services/printRequestService.ts",
    ),
    "utf8",
  );
  const portalWorkingSource = readFileSync(
    resolve(import.meta.dirname, "../../../../functions/src/lib/portalWorkingPrintRequest.ts"),
    "utf8",
  );

  it("uses one portal-editable working-request resolver in context and add flow", () => {
    assert.match(contextSource, /filterPortalEditableContinuablePrintRequests/);
    assert.match(contextSource, /selectPortalWorkingPrintRequest/);
    assert.match(contextSource, /selectedWorkingRequestId/);
    assert.match(addFlowSource, /resolvePortalWorkingRequestBranch/);
    assert.match(addFlowSource, /setSelectedWorkingRequestId\(printRequestId\)/);
  });

  it("aligns detail editability with portal origin policy", () => {
    assert.match(detailHookSource, /isPortalEditablePrintRequest/);
  });

  it("blocks Studio duplicate continuable customer request creation", () => {
    assert.match(printRequestServiceSource, /where\("status", "in", \["draft", "editing"\]\)/);
    assert.match(
      printRequestServiceSource,
      /already has an open print request/,
    );
    assert.match(printRequestServiceSource, /listCustomerIdsWithContinuableCustomerRequests/);
  });

  it("scopes portal create/attach guards to portal-editable continuable requests", () => {
    assert.match(portalWorkingSource, /filterPortalEditableContinuableDocs/);
    assert.match(portalWorkingSource, /isPortalEditablePrintRequest/);
  });
});
