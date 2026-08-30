import { createHash } from "node:crypto";

import type {
  ContinuablePrintRequestSummary,
  DuplicateVerificationMode,
} from "../../../packages/shared/src/types/customer/customerDuplicateResolution.types";
import type { CustomerEligibilitySnapshot } from "./customerAccountEligibility";
import { buildEligibilityChecksumFromSnapshot } from "./customerIdentityEligibilitySnapshot";

export interface AuthIdentityEmailEvidence {
  email: string | null;
  emailVerified: boolean | null;
}

export function normalizeEmailForDuplicateComparison(value: string | null | undefined): string | null {
  if (!value || typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

export function evaluateVerifiedEmailDuplicateMatch(input: {
  sourceCustomerEmail: string | null;
  survivorCustomerEmail: string | null;
  sourceAuth: AuthIdentityEmailEvidence | null;
  survivorAuth: AuthIdentityEmailEvidence | null;
}): { matches: boolean; reasons: string[] } {
  const sourceEmail =
    normalizeEmailForDuplicateComparison(input.sourceAuth?.email) ??
    normalizeEmailForDuplicateComparison(input.sourceCustomerEmail);
  const survivorEmail =
    normalizeEmailForDuplicateComparison(input.survivorAuth?.email) ??
    normalizeEmailForDuplicateComparison(input.survivorCustomerEmail);

  if (!sourceEmail || !survivorEmail) {
    return {
      matches: false,
      reasons: ["Both accounts must have a normalized email address on record."],
    };
  }

  if (sourceEmail !== survivorEmail) {
    return {
      matches: false,
      reasons: ["Normalized email addresses do not match."],
    };
  }

  const sourceVerified = input.sourceAuth?.emailVerified === true;
  const survivorVerified = input.survivorAuth?.emailVerified === true;

  if (!sourceVerified || !survivorVerified) {
    return {
      matches: false,
      reasons: ["Both Auth identities must have verified email addresses."],
    };
  }

  return {
    matches: true,
    reasons: ["Verified email match across both Auth identities."],
  };
}

export function resolveDuplicateVerification(input: {
  sourceCustomerId: string;
  survivorCustomerId: string;
  sourceCustomerEmail: string | null;
  survivorCustomerEmail: string | null;
  sourceAuth: AuthIdentityEmailEvidence | null;
  survivorAuth: AuthIdentityEmailEvidence | null;
  ownerAttestedSameCustomer?: boolean;
  ownerVerificationReason?: string;
}): {
  status: "verified" | "needs_owner_confirmation" | "blocked";
  mode: DuplicateVerificationMode | null;
  reasons: string[];
  requiresOwnerAttestation: boolean;
  requiresOwnerVerificationReason: boolean;
} {
  if (input.sourceCustomerId === input.survivorCustomerId) {
    return {
      status: "blocked",
      mode: null,
      reasons: ["Source and survivor must be different customer accounts."],
      requiresOwnerAttestation: false,
      requiresOwnerVerificationReason: false,
    };
  }

  const emailMatch = evaluateVerifiedEmailDuplicateMatch(input);
  if (emailMatch.matches) {
    return {
      status: "verified",
      mode: "verified_email",
      reasons: emailMatch.reasons,
      requiresOwnerAttestation: false,
      requiresOwnerVerificationReason: false,
    };
  }

  if (input.ownerAttestedSameCustomer) {
    const reason = input.ownerVerificationReason?.trim() ?? "";
    if (reason.length < 8) {
      return {
        status: "blocked",
        mode: null,
        reasons: ["Owner verification reason must be at least 8 characters."],
        requiresOwnerAttestation: true,
        requiresOwnerVerificationReason: true,
      };
    }

    return {
      status: "verified",
      mode: "owner_attested",
      reasons: [
        "Owner attested that both accounts belong to the same customer.",
        ...emailMatch.reasons,
      ],
      requiresOwnerAttestation: true,
      requiresOwnerVerificationReason: true,
    };
  }

  return {
    status: "needs_owner_confirmation",
    mode: null,
    reasons: [
      "Verified email match was not found. Owner attestation is required before Apply.",
      ...emailMatch.reasons,
    ],
    requiresOwnerAttestation: true,
    requiresOwnerVerificationReason: true,
  };
}

export function buildDuplicateResolutionPreviewChecksum(input: {
  sourceSnapshot: CustomerEligibilitySnapshot;
  survivorSnapshot: CustomerEligibilitySnapshot;
  desiredUsername: string;
  sourceContinuable: ContinuablePrintRequestSummary[];
  survivorContinuable: ContinuablePrintRequestSummary[];
  reservationOwnerCustomerId: string | null;
}): string {
  const payload = {
    source: buildEligibilityChecksumFromSnapshot(input.sourceSnapshot),
    survivor: buildEligibilityChecksumFromSnapshot(input.survivorSnapshot),
    desiredUsername: input.desiredUsername.trim().toLowerCase(),
    sourceContinuableIds: input.sourceContinuable.map((request) => request.id).sort(),
    survivorContinuableIds: input.survivorContinuable.map((request) => request.id).sort(),
    reservationOwnerCustomerId: input.reservationOwnerCustomerId,
  };

  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}
