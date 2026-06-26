import { FieldValue } from "firebase-admin/firestore";

import type { AiProcessingStage } from "../../../shared/types/ai/aiProcessing.types";
import { adminDb } from "../lib/admin";

export async function updateAiProcessingStage(
  designId: string,
  stage: AiProcessingStage,
): Promise<void> {
  await adminDb.collection("designs").doc(designId).update({
    aiProcessingStage: stage,
    updatedAt: FieldValue.serverTimestamp(),
  });
}
