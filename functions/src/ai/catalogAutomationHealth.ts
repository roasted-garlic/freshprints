import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "../lib/admin";

export const CATALOG_AUTOMATION_HEALTH_DOC_ID = "catalogAutomationHealth";

export interface CatalogAutomationHealthIncrements {
  analyzed?: number;
  wouldAutoApprove?: number;
  actuallyAutoApproved?: number;
  verifierInvoked?: number;
  /** Only incremented when a confirmable verifier path returns confirmed (rare). */
  verifierConfirmed?: number;
  verifierUnresolved?: number;
  routedNeedsReview?: number;
  /** Pipeline/enrichment re-attempts after a prior failure stage. */
  retries?: number;
  /** Pipeline terminal failures (markAiFailure path). */
  failures?: number;
  /** Algolia Ready publication sync failures (design remains Ready; reconcile recovers). */
  publicationFailures?: number;
  categoryGap?: number;
  hardBlockerRoutings?: number;
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
