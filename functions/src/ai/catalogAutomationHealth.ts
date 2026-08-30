import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "../lib/admin";

export const CATALOG_AUTOMATION_HEALTH_DOC_ID = "catalogAutomationHealth";

export interface CatalogAutomationHealthIncrements {
  analyzed?: number;
  wouldAutoApprove?: number;
  actuallyAutoApproved?: number;
  verifierInvoked?: number;
  verifierConfirmed?: number;
  verifierUnresolved?: number;
  routedNeedsReview?: number;
  retries?: number;
  failures?: number;
  categoryGap?: number;
}

/** Lightweight counters on settings/catalogAutomationHealth (Admin write only). */
export async function incrementCatalogAutomationHealth(
  increments: CatalogAutomationHealthIncrements,
): Promise<void> {
  const patch: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };

  for (const [key, value] of Object.entries(increments)) {
    if (typeof value === "number" && value !== 0) {
      patch[key] = FieldValue.increment(value);
    }
  }

  if (Object.keys(patch).length <= 1) {
    return;
  }

  await adminDb.collection("settings").doc(CATALOG_AUTOMATION_HEALTH_DOC_ID).set(patch, {
    merge: true,
  });
}
