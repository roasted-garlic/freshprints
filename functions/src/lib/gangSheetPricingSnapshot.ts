import type { Transaction } from "firebase-admin/firestore";

import { resolveGangSheetSectionPricingFromSettings } from "../../../packages/shared/src/constants/gangSheetSectionPricingSettings.constants";
export { buildGangSheetPricingSnapshot as buildShowAllocationPricingSnapshot } from "../../../packages/shared/src/utils/gangSheetPricingSnapshot";

export async function loadGangSheetPricingForTransaction(
  transaction: Transaction,
  adminDb: FirebaseFirestore.Firestore,
) {
  const snapshot = await transaction.get(adminDb.collection("settings").doc("showQueue"));
  return resolveGangSheetSectionPricingFromSettings(snapshot.data() ?? {});
}
