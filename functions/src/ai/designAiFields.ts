import { FieldValue } from "firebase-admin/firestore";

import type { AiProcessingStage } from "../../../packages/shared/src/types/ai/aiProcessing.types";
import { adminDb } from "../lib/admin";

export async function updateAiProcessingStage(
  designId: string,
  stage: AiProcessingStage,
  attemptId: string,
): Promise<boolean> {
  const designRef = adminDb.collection("designs").doc(designId);
  return adminDb.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(designRef);
    const data = snapshot.data() as { aiProcessingAttemptId?: unknown } | undefined;

    if (!snapshot.exists || data?.aiProcessingAttemptId !== attemptId) {
      return false;
    }

    transaction.update(designRef, {
      aiProcessingStage: stage,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return true;
  });
}
