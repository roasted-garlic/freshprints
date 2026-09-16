import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const here = path.dirname(fileURLToPath(import.meta.url));
const sharedEditability = readFileSync(
  path.resolve(here, "../../../../packages/shared/src/utils/portalPrintRequestEditability.ts"),
  "utf8",
);
const detailHook = readFileSync(
  path.resolve(here, "hooks/usePrintRequestDetail.ts"),
  "utf8",
);

test("staff-created customer requests are Portal-editable only in Editing", () => {
  assert.match(sharedEditability, /isPortalCustomerOriginPrintRequest\(request\)/);
  assert.match(sharedEditability, /request\.requestOrigin === "studio_customer" && request\.status === "editing"/);
  assert.match(sharedEditability, /request\.isInternal !== true/);
});

test("Portal detail uses the shared active editability predicate for content mutations", () => {
  assert.match(detailHook, /isPortalActiveEditablePrintRequest/);
});

test("Portal item mutation callables share the narrow editability contract", () => {
  const callableNames = [
    "addPortalCatalogDesignToPrintRequest.ts",
    "duplicatePortalPrintRequestItem.ts",
    "removePortalPrintRequestItem.ts",
    "updatePortalPrintRequestItemQuantity.ts",
    "updatePortalStaffArtworkPrintRequestItemSize.ts",
  ];

  for (const callableName of callableNames) {
    const source = readFileSync(
      path.resolve(here, "../../../../functions/src", callableName),
      "utf8",
    );
    assert.match(source, /isPortalEditablePrintRequest/);
    assert.match(source, /customerId/);
    assert.match(source, /status/);
  }
});
