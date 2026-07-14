import type {
  HalftoneStaffDecisionPersisted,
  HalftoneSubmitterResponsePersisted,
} from "../types/halftone/halftone.types";

function hasExplicitStaffBoolean(
  staffDecision?: HalftoneStaffDecisionPersisted | null,
): staffDecision is HalftoneStaffDecisionPersisted & { value: boolean } {
  return Boolean(staffDecision) && typeof staffDecision!.value === "boolean";
}

/**
 * Intake Halftone toggle initialization.
 *
 * Precedence:
 * 1. Explicit staff decision (including false)
 * 2. Customer marked yes → on
 * 3. Otherwise off (customer no / unanswered / missing)
 */
export function resolveIntakeHalftoneStaffToggle(input: {
  staffDecision?: HalftoneStaffDecisionPersisted | null;
  submitterResponse?: HalftoneSubmitterResponsePersisted | null;
}): boolean {
  if (hasExplicitStaffBoolean(input.staffDecision)) {
    return input.staffDecision.value;
  }
  return input.submitterResponse?.value === "yes";
}

/**
 * AI Review Halftone toggle initialization.
 * AI suggestions never auto-enable.
 *
 * Precedence:
 * 1. Explicit design staff decision (including false)
 * 2. Explicit staff decision copied from intake
 * 3. Customer yes when no staff decision exists
 * 4. Otherwise off
 */
export function resolveAiReviewHalftoneStaffToggle(input: {
  staffDecision?: HalftoneStaffDecisionPersisted | null;
  intakeStaffDecision?: HalftoneStaffDecisionPersisted | null;
  submitterResponse?: HalftoneSubmitterResponsePersisted | null;
}): boolean {
  if (hasExplicitStaffBoolean(input.staffDecision)) {
    return input.staffDecision.value;
  }
  if (hasExplicitStaffBoolean(input.intakeStaffDecision)) {
    return input.intakeStaffDecision.value;
  }
  return input.submitterResponse?.value === "yes";
}

/**
 * @deprecated Prefer resolveIntakeHalftoneStaffToggle or resolveAiReviewHalftoneStaffToggle.
 */
export function resolveInitialHalftoneStaffToggle(input: {
  staffDecision?: HalftoneStaffDecisionPersisted | null;
  submitterResponse?: HalftoneSubmitterResponsePersisted | null;
}): boolean {
  return resolveAiReviewHalftoneStaffToggle({
    staffDecision: input.staffDecision,
    submitterResponse: input.submitterResponse,
  });
}

/** Apply staff halftone decision to a tag name list (canonical lowercase name). */
export function syncHalftoneTagInList(
  tags: string[],
  markAsHalftone: boolean,
  canonicalHalftoneName = "halftone",
): string[] {
  const normalized = canonicalHalftoneName.trim().toLowerCase();
  const without = tags
    .map((tag) => tag.trim().toLowerCase())
    .filter((tag) => tag && tag !== normalized);
  if (markAsHalftone) {
    return [...without, normalized];
  }
  return without;
}
