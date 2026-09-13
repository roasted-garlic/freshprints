import type { DesignSmartProfile } from "@fresh-prints/shared/types/catalog/smartProfile.types";

/** Derive Would Auto Approve from existing shadow provenance (no duplicate persisted boolean). */
export function resolveWouldAutoApproveFromProvenance(
  profile: DesignSmartProfile | null | undefined,
): boolean {
  const provenance = profile?.provenance;
  if (!provenance) {
    return false;
  }
  if (
    provenance.automationDecision === "shadow" ||
    provenance.automationDecision === "auto_approved"
  ) {
    return true;
  }
  return provenance.automationReasonCodes?.includes("shadow_would_auto_approve") === true;
}

export function formatYesNo(value: boolean): "YES" | "NO" {
  return value ? "YES" : "NO";
}

/** ADR-FP-172: applied root Explicit write (not hypothetical Ready-only). */
export function resolveExplicitAppliedFromPreview(
  profile: DesignSmartProfile | null | undefined,
): boolean {
  const preview = profile?.provenance?.explicitAutomationPreview;
  if (!preview) {
    return false;
  }
  if (typeof preview.applied === "boolean") {
    return preview.applied;
  }
  return preview.wouldMarkExplicitContent === true;
}

export function resolveExplicitDetectedFromPreview(
  profile: DesignSmartProfile | null | undefined,
): boolean {
  const preview = profile?.provenance?.explicitAutomationPreview;
  if (!preview) {
    return false;
  }
  if (typeof preview.detected === "boolean") {
    return preview.detected;
  }
  return (
    preview.artworkHit === true && (preview.proposedCensoredTerms?.length ?? 0) > 0
  );
}

/**
 * Use the current preview when present; otherwise preserve visibility of
 * durable censored terms on older/pre-preview design records.
 */
export function resolveDisplayedExplicitTerms(
  profile: DesignSmartProfile | null | undefined,
  persistedTerms: readonly string[] | undefined,
  rootExplicitOn: boolean,
): string[] {
  const preview = profile?.provenance?.explicitAutomationPreview;
  if (preview) {
    return [...(preview.proposedCensoredTerms ?? [])];
  }
  if (!rootExplicitOn) {
    return [];
  }
  return [...(persistedTerms ?? [])].filter(
    (term): term is string => typeof term === "string" && term.trim().length > 0,
  );
}
