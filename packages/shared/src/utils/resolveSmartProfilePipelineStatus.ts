import {
  CURRENT_CATALOG_ENRICH_PROMPT_VERSION,
  SMART_PROFILE_NORMALIZER_VERSION,
} from "../constants/smartProfile.constants";
import type { DesignSmartProfile } from "../types/catalog/smartProfile.types";

export type SmartProfilePipelineStatus = "missing" | "current" | "older";

export interface SmartProfilePipelineStatusDetails {
  status: SmartProfilePipelineStatus;
  promptVersion: string | null;
  normalizerVersion: string | null;
  label: string;
}

export function resolveSmartProfilePipelineStatus(
  smartProfile: DesignSmartProfile | null | undefined,
): SmartProfilePipelineStatusDetails {
  if (!smartProfile || typeof smartProfile !== "object") {
    return {
      status: "missing",
      promptVersion: null,
      normalizerVersion: null,
      label: "Smart Profile: Missing",
    };
  }

  const promptVersion =
    typeof smartProfile.provenance?.promptVersion === "string" &&
    smartProfile.provenance.promptVersion.trim()
      ? smartProfile.provenance.promptVersion.trim()
      : null;
  const normalizerVersion =
    typeof smartProfile.provenance?.normalizerVersion === "string" &&
    smartProfile.provenance.normalizerVersion.trim()
      ? smartProfile.provenance.normalizerVersion.trim()
      : null;

  const isCurrent =
    promptVersion === CURRENT_CATALOG_ENRICH_PROMPT_VERSION &&
    normalizerVersion === SMART_PROFILE_NORMALIZER_VERSION;

  if (isCurrent) {
    return {
      status: "current",
      promptVersion,
      normalizerVersion,
      label: `Smart Profile: Current (${CURRENT_CATALOG_ENRICH_PROMPT_VERSION} / ${SMART_PROFILE_NORMALIZER_VERSION})`,
    };
  }

  const promptLabel = promptVersion ?? "unknown";
  const normalizerLabel = normalizerVersion ?? "unknown";
  return {
    status: "older",
    promptVersion,
    normalizerVersion,
    label: `Smart Profile: Older (${promptLabel} / ${normalizerLabel})`,
  };
}
