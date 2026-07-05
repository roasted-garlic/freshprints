import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { PrintRequest } from "../../../../../../shared/types/printRequest/printRequest.types";
import {
  getPrintRequestOriginBadgeLabel,
  isPrintRequestOrigin,
} from "../../../../../../shared/utils/printRequestOrigin";

function buildRequest(
  input: Pick<PrintRequest, "isInternal"> & Partial<Pick<PrintRequest, "customerId" | "requestOrigin">>,
): Pick<PrintRequest, "requestOrigin" | "isInternal" | "customerId"> {
  return input;
}

describe("print request origin", () => {
  it("recognizes supported persisted request origins", () => {
    assert.equal(isPrintRequestOrigin("studio_internal"), true);
    assert.equal(isPrintRequestOrigin("studio_customer"), true);
    assert.equal(isPrintRequestOrigin("portal_customer"), true);
    assert.equal(isPrintRequestOrigin("internal-0001"), false);
    assert.equal(isPrintRequestOrigin(undefined), false);
  });

  it("formats explicit origin badges without reading request names", () => {
    assert.equal(
      getPrintRequestOriginBadgeLabel(buildRequest({ isInternal: true, requestOrigin: "studio_internal" })),
      "Internal",
    );
    assert.equal(
      getPrintRequestOriginBadgeLabel(buildRequest({
        customerId: "customer-1",
        isInternal: false,
        requestOrigin: "studio_customer",
      })),
      "Staff Created",
    );
    assert.equal(
      getPrintRequestOriginBadgeLabel(buildRequest({
        customerId: "customer-1",
        isInternal: false,
        requestOrigin: "portal_customer",
      })),
      "Customer Submitted",
    );
  });

  it("keeps legacy requests readable with compatibility badge labels", () => {
    assert.equal(getPrintRequestOriginBadgeLabel(buildRequest({ isInternal: true })), "Internal");
    assert.equal(
      getPrintRequestOriginBadgeLabel(buildRequest({ customerId: "customer-1", isInternal: false })),
      "Staff Created",
    );
    assert.equal(getPrintRequestOriginBadgeLabel(buildRequest({ isInternal: false })), "Legacy");
  });
});
