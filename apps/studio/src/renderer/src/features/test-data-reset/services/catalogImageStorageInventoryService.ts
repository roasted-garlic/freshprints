import { httpsCallable } from "firebase/functions";

import type { CatalogImageStorageInventoryReport } from "@fresh-prints/shared/utils/catalogImageStorageInventory";

import { functions } from "../../../config/firebase";

function getCallableErrorMessage(error: unknown, fallbackMessage: string): string {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string" &&
    error.message.trim()
  ) {
    return error.message;
  }

  return fallbackMessage;
}

export interface InventoryCatalogImageStorageResponse {
  dryRun: true;
  scannedFamilies: string[];
  designsScanned: number;
  promotionsScanned: number;
  report: CatalogImageStorageInventoryReport;
  truncatedFamilies: string[];
}

/**
 * Goal #12 dev-only tool: invokes the already-deployed, dry-run-only, owner/admin-restricted
 * `inventoryCatalogImageStorage` callable. Read-only — never deletes or modifies Storage/Firestore
 * data. Mirrors `retentionMaintenanceService.ts`'s exact callable-invocation pattern.
 */
export async function runInventoryCatalogImageStorage(): Promise<InventoryCatalogImageStorageResponse> {
  try {
    const callable = httpsCallable<Record<string, never>, InventoryCatalogImageStorageResponse>(
      functions,
      "inventoryCatalogImageStorage",
    );
    const response = await callable({});
    return response.data;
  } catch (error) {
    throw new Error(
      getCallableErrorMessage(error, "Unable to run the catalog Storage inventory. Please try again."),
    );
  }
}
