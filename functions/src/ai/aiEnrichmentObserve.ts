import { getApps } from "firebase-admin/app";

import { adminDb } from "../lib/admin";
import {
  generateAiEnrichmentCandidateForDesign,
  type AiEnrichmentCandidate,
  type AiEnrichmentDesignInput,
} from "./aiEnrichmentCandidateCore";
import {
  assertFlagshipObserveAllowed,
  FLAGSHIP_OBSERVE_DESIGN_IDS,
} from "./calibrationDesignImmutability";

export { FLAGSHIP_OBSERVE_DESIGN_IDS };

export type AiEnrichmentObserveResult = AiEnrichmentCandidate & {
  designId: string;
  observedAt: string;
};

function resolveFirebaseProjectId(): string | undefined {
  const fromEnv = process.env.FIREBASE_PROJECT_ID?.trim() || process.env.GCLOUD_PROJECT?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  const apps = getApps();
  const fromApp = apps[0]?.options?.projectId;
  return typeof fromApp === "string" ? fromApp : undefined;
}

/**
 * Read-only flagship calibration observe — calls shared candidate core only.
 * Fail-closed to fresh-prints-dev + six hard-coded design IDs.
 * Must never persist design state or call pipeline write helpers.
 */
export async function runAiEnrichmentObserveForDesign(input: {
  designId: string;
  geminiApiKey: string;
}): Promise<AiEnrichmentObserveResult> {
  const { designId, geminiApiKey } = input;

  assertFlagshipObserveAllowed(resolveFirebaseProjectId(), designId);

  const designSnapshot = await adminDb.collection("designs").doc(designId).get();
  if (!designSnapshot.exists) {
    throw new Error(`Flagship observe: design ${designId} not found.`);
  }

  const data = designSnapshot.data() as AiEnrichmentDesignInput & Record<string, unknown>;
  const design: AiEnrichmentDesignInput = {
    id: designId,
    title: typeof data.title === "string" ? data.title : "",
    previewPath: typeof data.previewPath === "string" ? data.previewPath : undefined,
    thumbnailPath: typeof data.thumbnailPath === "string" ? data.thumbnailPath : undefined,
    artworkBackgroundHex:
      typeof data.artworkBackgroundHex === "string" ? data.artworkBackgroundHex : undefined,
    aiRequestedVisionModelId:
      typeof data.aiRequestedVisionModelId === "string" ? data.aiRequestedVisionModelId : undefined,
    tags: Array.isArray(data.tags) ? (data.tags as string[]) : undefined,
  };

  if (!design.previewPath && !design.thumbnailPath) {
    throw new Error(`Flagship observe: design ${designId} has no previewPath or thumbnailPath.`);
  }

  const candidate = await generateAiEnrichmentCandidateForDesign({
    designId,
    design,
    geminiApiKey,
    diagnosticContext: {
      functionName: "runAiEnrichmentObserveForDesign",
      invocationId: `observe-${designId}`,
      designId,
    },
    // Observe must NOT write processing stages.
  });

  return {
    ...candidate,
    designId,
    observedAt: new Date().toISOString(),
  };
}
