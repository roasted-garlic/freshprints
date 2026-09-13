import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  evaluateVerifiedEmailDuplicateMatch,
  normalizeEmailForDuplicateComparison,
  resolveDuplicateVerification,
} from "./customerDuplicateVerification";

describe("customerDuplicateVerification", () => {
  it("matches verified emails across both Auth identities", () => {
    const result = evaluateVerifiedEmailDuplicateMatch({
      sourceCustomerEmail: "user@example.com",
      survivorCustomerEmail: "user@example.com",
      sourceAuth: { email: "user@example.com", emailVerified: true },
      survivorAuth: { email: "user@example.com", emailVerified: true },
    });

    assert.equal(result.matches, true);
  });

  it("rejects different normalized emails without owner attestation", () => {
    const result = resolveDuplicateVerification({
      sourceCustomerId: "source-1",
      survivorCustomerId: "survivor-1",
      sourceCustomerEmail: "a@example.com",
      survivorCustomerEmail: "b@example.com",
      sourceAuth: { email: "a@example.com", emailVerified: true },
      survivorAuth: { email: "b@example.com", emailVerified: true },
    });

    assert.equal(result.status, "needs_owner_confirmation");
    assert.equal(result.requiresOwnerAttestation, true);
  });

  it("accepts owner attestation with verification reason", () => {
    const result = resolveDuplicateVerification({
      sourceCustomerId: "source-1",
      survivorCustomerId: "survivor-1",
      sourceCustomerEmail: "a@example.com",
      survivorCustomerEmail: "b@example.com",
      sourceAuth: { email: "a@example.com", emailVerified: true },
      survivorAuth: { email: "b@example.com", emailVerified: true },
      ownerAttestedSameCustomer: true,
      ownerVerificationReason: "Customer confirmed both logins in support ticket.",
    });

    assert.equal(result.status, "verified");
    assert.equal(result.mode, "owner_attested");
  });

  it("rejects owner attestation without a long enough reason", () => {
    const result = resolveDuplicateVerification({
      sourceCustomerId: "source-1",
      survivorCustomerId: "survivor-1",
      sourceCustomerEmail: "a@example.com",
      survivorCustomerEmail: "b@example.com",
      sourceAuth: { email: "a@example.com", emailVerified: true },
      survivorAuth: { email: "b@example.com", emailVerified: true },
      ownerAttestedSameCustomer: true,
      ownerVerificationReason: "short",
    });

    assert.equal(result.status, "blocked");
  });

  it("rejects when source and survivor are the same customer", () => {
    const result = resolveDuplicateVerification({
      sourceCustomerId: "same-id",
      survivorCustomerId: "same-id",
      sourceCustomerEmail: "user@example.com",
      survivorCustomerEmail: "user@example.com",
      sourceAuth: { email: "user@example.com", emailVerified: true },
      survivorAuth: { email: "user@example.com", emailVerified: true },
    });

    assert.equal(result.status, "blocked");
  });

  it("does not auto-verify on display-name-like email mismatch alone", () => {
    const normalizedA = normalizeEmailForDuplicateComparison(" Alice@Example.COM ");
    const normalizedB = normalizeEmailForDuplicateComparison("bob@example.com");
    assert.equal(normalizedA, "alice@example.com");
    assert.notEqual(normalizedA, normalizedB);
  });
});
