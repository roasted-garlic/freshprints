import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateCustomerPrintRequestConversionEligibility,
  PRINT_REQUEST_CONVERTED_TO_INTERNAL_LABEL,
  resolvePortalPrintRequestProgressLabel,
} from "./printRequestConversion";

test("resolvePortalPrintRequestProgressLabel returns converted copy", () => {
  assert.equal(
    resolvePortalPrintRequestProgressLabel({
      closureKind: "converted_to_internal",
      status: "archived",
      defaultLabel: "Printed",
    }),
    PRINT_REQUEST_CONVERTED_TO_INTERNAL_LABEL,
  );
});

test("evaluateCustomerPrintRequestConversionEligibility blocks in_progress allocations", () => {
  const result = evaluateCustomerPrintRequestConversionEligibility({
    isInternal: false,
    requestOrigin: "portal_customer",
    status: "active",
    allocations: [{ id: "a1", upcomingShowId: "s1", status: "in_progress", allocatedQuantity: 2 }],
    linkedShowsPrinting: false,
  });
  assert.equal(result.eligible, false);
  assert.match(result.reason ?? "", /in progress/i);
});

test("evaluateCustomerPrintRequestConversionEligibility allows pending allocations for cancel", () => {
  const result = evaluateCustomerPrintRequestConversionEligibility({
    isInternal: false,
    requestOrigin: "portal_customer",
    status: "active",
    allocations: [{ id: "a1", upcomingShowId: "s1", status: "pending", allocatedQuantity: 2 }],
    linkedShowsPrinting: false,
  });
  assert.equal(result.eligible, true);
  assert.equal(result.cancelableAllocations.length, 1);
});
