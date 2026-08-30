import type { DesignSmartProfile } from "@fresh-prints/shared/types/catalog/smartProfile.types";

function formatAutomationDecision(decision: string | undefined): string {
  if (!decision) {
    return "Unknown";
  }
  return decision.replace(/_/g, " ");
}

function resolveVerifierOutcome(profile: DesignSmartProfile): string {
  const codes = profile.provenance.automationReasonCodes ?? [];
  if (codes.includes("verifier_unresolved")) {
    return "Unresolved";
  }
  if (codes.includes("verifier_confirmed")) {
    return "Confirmed";
  }
  if (profile.provenance.verifierInvoked) {
    return "Invoked";
  }
  return "Not invoked";
}

function hasHardBlock(codes: string[]): boolean {
  return codes.some(
    (code) =>
      code.startsWith("hard_block:") ||
      code === "hard_block" ||
      code.includes("hard_block"),
  );
}

export interface SmartProfileAutomationSummary {
  automationDecision: string;
  automationReasonCodes: string;
  verifierInvoked: string;
  verifierOutcome: string;
  hardBlock: string;
  categoryGap: string;
  categoryDominantIntentConflict: string;
}

export function buildSmartProfileAutomationSummary(
  profile: DesignSmartProfile,
): SmartProfileAutomationSummary {
  const codes = profile.provenance.automationReasonCodes ?? [];
  return {
    automationDecision: formatAutomationDecision(profile.provenance.automationDecision),
    automationReasonCodes: codes.length > 0 ? codes.join(", ") : "—",
    verifierInvoked: profile.provenance.verifierInvoked ? "Yes" : "No",
    verifierOutcome: resolveVerifierOutcome(profile),
    hardBlock: hasHardBlock(codes) ? "Yes" : "No",
    categoryGap: profile.categoryGapSuggested ? "Yes" : "No",
    categoryDominantIntentConflict: codes.some((code) =>
      code.includes("category_dominant_intent_conflict"),
    )
      ? "Yes"
      : "No",
  };
}

export function buildSmartProfileProvenanceFields(profile: DesignSmartProfile): Array<{
  label: string;
  value: string;
}> {
  const provenance = profile.provenance;
  return [
    { label: "Prompt version", value: provenance.promptVersion ?? "—" },
    { label: "Normalizer version", value: provenance.normalizerVersion ?? "—" },
    { label: "Generated at", value: provenance.generatedAt ?? "—" },
    { label: "Provider", value: provenance.provider ?? "—" },
    { label: "Model", value: provenance.model ?? "—" },
    { label: "Profile version", value: provenance.version ?? "—" },
    {
      label: "Staff-edited dimensions",
      value: provenance.staffEditedDimensionKeys?.join(", ") ?? "—",
    },
    { label: "Staff edited at", value: provenance.staffEditedAt ?? "—" },
    { label: "Staff edited by", value: provenance.staffEditedBy ?? "—" },
  ];
}
