import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

function read(relativePath: string): string {
  return readFileSync(path.join(here, relativePath), "utf8");
}

test("updateCustomerPrintRequestQuotaOverride is owner-only", () => {
  const source = read("updateCustomerPrintRequestQuotaOverride.ts");
  assert.match(source, /role !== "owner"/);
  assert.match(source, /Only active owners can update customer print request quota overrides/);
  assert.match(source, /account\.quota_override_set/);
  assert.match(source, /account\.quota_override_cleared/);
  assert.match(source, /FieldValue\.delete\(\)/);
  // Firestore rejects undefined metadata values (Internal error on Save with no expiration).
  assert.doesNotMatch(source, /expiresAtMs:\s*parsed\.expiresAtMs\s*\?\?\s*undefined/);
  assert.match(source, /parsed\.expiresAtMs != null \? \{ expiresAtMs: parsed\.expiresAtMs \} : \{\}/);
});

test("Portal quota consumers load effective customer limits", () => {
  const files = [
    "addPortalCatalogDesignToPrintRequest.ts",
    "confirmCustomerUploadsAndAttachToRequest.ts",
    "duplicatePortalPrintRequestItem.ts",
    "updatePortalPrintRequestItemQuantity.ts",
    "customerAddAssistedApprovedProofToPrintRequest.ts",
    "queuePortalPrintRequestToShow.ts",
  ];
  for (const file of files) {
    const source = read(file);
    assert.match(
      source,
      /loadEffectivePrintRequestLimitsForCustomer/,
      `${file} must resolve effective limits`,
    );
  }
});

test("Studio staff recovery paths do not call effective customer quota loader", () => {
  const move = read("lib/showQueueMove.ts");
  const requeue = read("lib/showProductionRecoveryRequeue.ts");
  assert.doesNotMatch(move, /loadEffectivePrintRequestLimitsForCustomer/);
  assert.doesNotMatch(requeue, /loadEffectivePrintRequestLimitsForCustomer/);
  assert.doesNotMatch(move, /maxQuantityPerShowPerCustomer/);
  assert.doesNotMatch(requeue, /maxQuantityPerShowPerCustomer/);
});
