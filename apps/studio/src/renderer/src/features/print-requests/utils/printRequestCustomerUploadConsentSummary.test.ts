import assert from "node:assert/strict";
import test from "node:test";

import type { PrintRequestItem } from "@fresh-prints/shared/types/printRequest/printRequest.types";

import { resolvePrintRequestItemLibraryConsentIcon } from "./printRequestCustomerUploadConsentSummary.ts";

function item(
  partial: Partial<PrintRequestItem> & Pick<PrintRequestItem, "id" | "printRequestId">,
): PrintRequestItem {
  return {
    quantity: 1,
    status: "pending",
    addedBy: "u1",
    createdAt: {} as PrintRequestItem["createdAt"],
    updatedAt: {} as PrintRequestItem["updatedAt"],
    ...partial,
  };
}

test("catalog items get no library consent icon", () => {
  assert.equal(
    resolvePrintRequestItemLibraryConsentIcon(
      item({ id: "i1", printRequestId: "r1", designId: "d1", sourceType: "catalog_design" }),
      { catalogUseAcknowledged: true },
    ),
    null,
  );
});

test("assisted-creation uploads get no library consent icon", () => {
  assert.equal(
    resolvePrintRequestItemLibraryConsentIcon(
      item({
        id: "i1",
        printRequestId: "r1",
        sourceType: "customer_upload",
        customerUploadId: "up-assisted",
      }),
      { catalogUseAcknowledged: true, assistedCreationRequestId: "acr-1" },
    ),
    null,
  );
});

test("pending consent gets no icon", () => {
  assert.equal(
    resolvePrintRequestItemLibraryConsentIcon(
      item({
        id: "i1",
        printRequestId: "r1",
        sourceType: "customer_upload",
        customerUploadId: "up-1",
      }),
      { catalogUseAcknowledged: null },
    ),
    null,
  );
});

test("approved and denied map to icon states", () => {
  const uploadItem = item({
    id: "i1",
    printRequestId: "r1",
    sourceType: "customer_upload",
    customerUploadId: "up-1",
  });
  assert.equal(
    resolvePrintRequestItemLibraryConsentIcon(uploadItem, { catalogUseAcknowledged: true }),
    "approved",
  );
  assert.equal(
    resolvePrintRequestItemLibraryConsentIcon(uploadItem, { catalogUseAcknowledged: false }),
    "denied",
  );
});
