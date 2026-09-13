import { FieldValue } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";

import {
  CATALOG_WORKFLOW_MODES,
  ENABLE_AUTONOMOUS_CONFIRMATION_PHRASE,
  resolveCatalogAutonomousLiveEnabled,
  resolveCatalogWorkflowMode,
  type CatalogWorkflowMode,
} from "../../packages/shared/src/constants/catalogWorkflowMode.constants";
import { loadCallerProfile } from "./lib/caller";
import { adminDb } from "./lib/admin";
import { invalidArgument, permissionDenied, unauthenticated } from "./lib/errors";
import { AI_ENRICHMENT_SETTINGS_DOC_ID } from "./ai/loadAiEnrichmentSettings";
import { clearAiEnrichmentRuntimeCache } from "./ai/aiEnrichmentRuntimeCache";
import { logPipelineEvent } from "./lib/pipelineLog";

interface UpdateCatalogWorkflowModeRequest {
  catalogWorkflowMode: CatalogWorkflowMode;
  catalogAutonomousLiveEnabled?: boolean;
  confirmationPhrase?: string;
}

function assertOwnerCaller(caller: Awaited<ReturnType<typeof loadCallerProfile>>): void {
  if (!caller.isActive || caller.role !== "owner") {
    throw permissionDenied("Only the owner can change Catalog Processing Mode or live Autonomous.");
  }
}

function validateRequest(data: unknown): UpdateCatalogWorkflowModeRequest {
  if (!data || typeof data !== "object") {
    throw invalidArgument("Request data is required.");
  }

  const rawMode =
    "catalogWorkflowMode" in data && typeof data.catalogWorkflowMode === "string"
      ? data.catalogWorkflowMode.trim().toLowerCase()
      : "";

  if (!(CATALOG_WORKFLOW_MODES as readonly string[]).includes(rawMode)) {
    throw invalidArgument(
      `catalogWorkflowMode must be one of: ${CATALOG_WORKFLOW_MODES.join(", ")}.`,
    );
  }

  const catalogWorkflowMode = rawMode as CatalogWorkflowMode;
  const wantsLive =
    "catalogAutonomousLiveEnabled" in data ? data.catalogAutonomousLiveEnabled === true : undefined;
  const confirmationPhrase =
    "confirmationPhrase" in data && typeof data.confirmationPhrase === "string"
      ? data.confirmationPhrase.trim()
      : undefined;

  return {
    catalogWorkflowMode,
    catalogAutonomousLiveEnabled: wantsLive,
    confirmationPhrase,
  };
}

export const updateCatalogWorkflowMode = onCall(
  async (
    request,
  ): Promise<{
    catalogWorkflowMode: CatalogWorkflowMode;
    catalogAutonomousLiveEnabled: boolean;
  }> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    const caller = await loadCallerProfile(request.auth.uid);
    assertOwnerCaller(caller);

    const input = validateRequest(request.data);
    const existing = await adminDb.collection("settings").doc(AI_ENRICHMENT_SETTINGS_DOC_ID).get();
    const existingData = existing.data();
    const previousLive = resolveCatalogAutonomousLiveEnabled(
      existingData?.catalogAutonomousLiveEnabled,
    );

    let nextLive = previousLive;
    if (input.catalogAutonomousLiveEnabled === true) {
      if (input.confirmationPhrase !== ENABLE_AUTONOMOUS_CONFIRMATION_PHRASE) {
        throw invalidArgument(
          `Enabling live Autonomous requires typing ${ENABLE_AUTONOMOUS_CONFIRMATION_PHRASE}.`,
        );
      }
      if (input.catalogWorkflowMode !== "autonomous") {
        throw invalidArgument("Live Autonomous requires Catalog Processing Mode = Autonomous.");
      }
      nextLive = true;
    } else if (input.catalogAutonomousLiveEnabled === false) {
      nextLive = false;
    }

    // Selecting a non-autonomous mode clears the live gate.
    if (input.catalogWorkflowMode !== "autonomous") {
      nextLive = false;
    }

    const patch: Record<string, unknown> = {
      catalogWorkflowMode: input.catalogWorkflowMode,
      catalogAutonomousLiveEnabled: nextLive,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: request.auth.uid,
    };

    if (nextLive && !previousLive) {
      patch.catalogAutonomousLiveEnabledAt = FieldValue.serverTimestamp();
      patch.catalogAutonomousLiveEnabledBy = request.auth.uid;
    }

    if (!nextLive) {
      patch.catalogAutonomousLiveEnabledAt = FieldValue.delete();
      patch.catalogAutonomousLiveEnabledBy = FieldValue.delete();
    }

    await adminDb.collection("settings").doc(AI_ENRICHMENT_SETTINGS_DOC_ID).set(patch, {
      merge: true,
    });

    clearAiEnrichmentRuntimeCache();

    logPipelineEvent("settings.catalog_workflow_mode.updated", {
      catalogWorkflowMode: input.catalogWorkflowMode,
      catalogAutonomousLiveEnabled: nextLive,
      updatedBy: request.auth.uid,
      resolvedMode: resolveCatalogWorkflowMode(input.catalogWorkflowMode),
    });

    return {
      catalogWorkflowMode: input.catalogWorkflowMode,
      catalogAutonomousLiveEnabled: nextLive,
    };
  },
);
