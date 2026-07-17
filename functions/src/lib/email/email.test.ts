import assert from "node:assert/strict";
import test from "node:test";

import { buildProofReadyEmail, escapeEmailHtml } from "./emailTemplates";
import { canClaimEmailJob, shouldRetryEmailFailure } from "./emailDeliveryPolicy";
import { createProofEmailJobId } from "./emailJobIdentity";
import { createResendEmailProvider } from "./resendEmailProvider";
import { EmailDeliveryError } from "./email.types";
import { resolvePortalBaseUrl } from "./portalUrlResolver";
import { resolveProofRecipientFromDocuments } from "./proofRecipient";

test("email templates escape dynamic HTML", () => {
  assert.equal(escapeEmailHtml(`<script>"x" & 'y'</script>`), "&lt;script&gt;&quot;x&quot; &amp; &#39;y&#39;&lt;/script&gt;");
  const message = buildProofReadyEmail({
    from: "sender@example.com",
    to: "customer@example.com",
    displayName: "<Customer>",
    reviewUrl: "https://example.com/?x=1&y=2",
  });
  assert.match(message.html, /&lt;Customer&gt;/);
  assert.match(message.html, /x=1&amp;y=2/);
});

test("portal URLs are mapped by project and unknown projects fail closed", () => {
  assert.equal(
    resolvePortalBaseUrl({ projectId: "fresh-prints-dev" }),
    "https://myprintrequest.dev",
  );
  assert.throws(
    () => resolvePortalBaseUrl({ projectId: "unknown" }),
    (error: unknown) =>
      error instanceof EmailDeliveryError && error.code === "portal_environment_unknown",
  );
});

test("local portal override is emulator-only", () => {
  assert.equal(
    resolvePortalBaseUrl({
      override: "http://localhost:3100/",
      isEmulator: true,
    }),
    "http://localhost:3100",
  );
  assert.throws(() =>
    resolvePortalBaseUrl({
      override: "https://attacker.example",
      isEmulator: true,
    }),
  );
});

test("Resend adapter sets idempotency and maps transient failures", async () => {
  let idempotency = "";
  const provider = createResendEmailProvider(
    "test-key",
    (async (_url, init) => {
      idempotency = new Headers(init?.headers).get("Idempotency-Key") ?? "";
      return new Response("", { status: 429 });
    }) as typeof fetch,
  );

  await assert.rejects(
    provider.send(
      { from: "a@example.com", to: "b@example.com", subject: "test", html: "<p>test</p>" },
      "stable-job",
    ),
    (error: unknown) =>
      error instanceof EmailDeliveryError &&
      error.code === "provider_rate_limited" &&
      error.transient,
  );
  assert.equal(idempotency, "stable-job");
});

test("Resend adapter returns provider message id", async () => {
  const provider = createResendEmailProvider(
    "test-key",
    (async () =>
      new Response(JSON.stringify({ id: "email_123" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })) as typeof fetch,
  );
  assert.deepEqual(
    await provider.send(
      { from: "a@example.com", to: "b@example.com", subject: "test", html: "<p>test</p>" },
      "stable-job",
    ),
    { provider: "resend", providerMessageId: "email_123" },
  );
});

test("delivery policy reclaims stale leases and bounds attempts", () => {
  assert.equal(
    canClaimEmailJob({
      status: "sending",
      attemptCount: 1,
      leaseExpiresAtMs: 999,
      nowMs: 1_000,
    }),
    true,
  );
  assert.equal(
    canClaimEmailJob({
      status: "sending",
      attemptCount: 1,
      leaseExpiresAtMs: 1_001,
      nowMs: 1_000,
    }),
    false,
  );
  assert.equal(canClaimEmailJob({ status: "sent", attemptCount: 0, nowMs: 1_000 }), false);
  assert.equal(canClaimEmailJob({ status: "pending", attemptCount: 5, nowMs: 1_000 }), false);
  assert.equal(shouldRetryEmailFailure(true, 4), true);
  assert.equal(shouldRetryEmailFailure(true, 5), false);
  assert.equal(shouldRetryEmailFailure(false, 1), false);
});

test("proof job identity is deterministic and Firestore-safe", () => {
  const first = createProofEmailJobId("request/a", "proof/b");
  assert.equal(first, createProofEmailJobId("request/a", "proof/b"));
  assert.notEqual(first, createProofEmailJobId("request/a", "proof/c"));
  assert.equal(first.includes("/"), false);
  assert.equal(first.length, "assisted-proof-".length + 64);
});

test("proof recipient requires matching customer linkage and validates fallback", () => {
  assert.deepEqual(
    resolveProofRecipientFromDocuments({
      customerId: "customer-1",
      customerUid: "user-1",
      customer: {
        id: "customer-1",
        userId: "user-1",
        email: " CUSTOMER@Example.com ",
        displayName: "Customer",
      },
      user: undefined,
    }),
    { email: "customer@example.com", displayName: "Customer" },
  );
  assert.throws(
    () =>
      resolveProofRecipientFromDocuments({
        customerId: "customer-1",
        customerUid: "user-1",
        customer: { id: "customer-1", userId: "other-user" },
        user: { id: "user-1", role: "customer", isActive: true, email: "valid@example.com" },
      }),
    (error: unknown) =>
      error instanceof EmailDeliveryError && error.code === "recipient_link_mismatch",
  );
  assert.deepEqual(
    resolveProofRecipientFromDocuments({
      customerId: "customer-1",
      customerUid: "user-1",
      customer: { id: "customer-1", userId: "user-1", displayName: "Customer" },
      user: { id: "user-1", role: "customer", isActive: true, email: "valid@example.com" },
    }),
    { email: "valid@example.com", displayName: "Customer" },
  );
});
