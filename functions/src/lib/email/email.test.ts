import assert from "node:assert/strict";
import test from "node:test";

import {
  UNMONITORED_EMAIL_DISCLAIMER_TEXT,
  appendUnmonitoredEmailFooter,
  buildCatalogShareReadyEmail,
  buildCustomerInvitationEmail,
  buildProofReadyEmail,
  buildTeamInvitationEmail,
  escapeEmailHtml,
} from "./emailTemplates";
import { canClaimEmailJob, shouldRetryEmailFailure } from "./emailDeliveryPolicy";
import { createProofEmailJobId } from "./emailJobIdentity";
import {
  brevoIdempotencyKey,
  createBrevoEmailProvider,
  parseEmailFromAddress,
} from "./brevoEmailProvider";
import { createResendEmailProvider } from "./resendEmailProvider";
import { EmailDeliveryError } from "./email.types";
import { resolvePortalBaseUrl, resolvePortalLoginContinueUrl } from "./portalUrlResolver";
import { resolveProofRecipientFromDocuments } from "./proofRecipient";
import { resolveEmailApiKey } from "./resolveEmailApiKey";
import { sendEmail } from "./emailRouter";

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

test("unmonitored disclaimer footer is shared and present on all templates", () => {
  const withFooter = appendUnmonitoredEmailFooter("<p>body</p>");
  assert.match(withFooter, /body/);
  assert.match(withFooter, new RegExp(UNMONITORED_EMAIL_DISCLAIMER_TEXT.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

  const templates = [
    buildTeamInvitationEmail({
      from: "Fresh Prints <noreply@myprintrequest.com>",
      to: "a@example.com",
      displayName: "Ada",
      role: "helper",
      resetLink: "https://example.com/reset",
    }),
    buildCustomerInvitationEmail({
      from: "Fresh Prints <noreply@myprintrequest.com>",
      to: "b@example.com",
      displayName: "Bea",
      username: "bea",
      resetLink: "https://example.com/reset",
    }),
    buildProofReadyEmail({
      from: "Fresh Prints <noreply@myprintrequest.com>",
      to: "c@example.com",
      displayName: "Cy",
      reviewUrl: "https://example.com/review",
    }),
    buildCatalogShareReadyEmail({
      from: "Fresh Prints <noreply@myprintrequest.com>",
      to: "d@example.com",
      displayName: "Di",
      reviewUrl: "https://example.com/review",
    }),
  ];

  for (const message of templates) {
    assert.match(message.html, /not monitored/);
    assert.match(message.html, /do not reply/i);
  }
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

test("portal login continue URL follows project map and strips trailing slash", () => {
  const previousProject = process.env.GCLOUD_PROJECT;
  const previousEmulator = process.env.FUNCTIONS_EMULATOR;
  const previousOverride = process.env.PORTAL_BASE_URL;
  try {
    process.env.GCLOUD_PROJECT = "fresh-prints-dev";
    delete process.env.FUNCTIONS_EMULATOR;
    delete process.env.PORTAL_BASE_URL;
    assert.equal(resolvePortalLoginContinueUrl(), "https://myprintrequest.dev/login");

    process.env.GCLOUD_PROJECT = "fresh-prints-prod";
    assert.equal(resolvePortalLoginContinueUrl(), "https://myprintrequest.com/login");

    process.env.FUNCTIONS_EMULATOR = "true";
    process.env.PORTAL_BASE_URL = "http://localhost:3100/";
    assert.equal(resolvePortalLoginContinueUrl(), "http://localhost:3100/login");
  } finally {
    if (previousProject === undefined) {
      delete process.env.GCLOUD_PROJECT;
    } else {
      process.env.GCLOUD_PROJECT = previousProject;
    }
    if (previousEmulator === undefined) {
      delete process.env.FUNCTIONS_EMULATOR;
    } else {
      process.env.FUNCTIONS_EMULATOR = previousEmulator;
    }
    if (previousOverride === undefined) {
      delete process.env.PORTAL_BASE_URL;
    } else {
      process.env.PORTAL_BASE_URL = previousOverride;
    }
  }
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

test("parseEmailFromAddress handles display name and bare email", () => {
  assert.deepEqual(parseEmailFromAddress('Fresh Prints <team@example.com>'), {
    email: "team@example.com",
    name: "Fresh Prints",
  });
  assert.deepEqual(parseEmailFromAddress("team@example.com"), { email: "team@example.com" });
});

test("Brevo adapter maps rate limits and returns messageId", async () => {
  let capturedBody = "";
  const rateLimited = createBrevoEmailProvider(
    "test-key",
    (async () => new Response("", { status: 429 })) as typeof fetch,
  );
  await assert.rejects(
    rateLimited.send(
      { from: "a@example.com", to: "b@example.com", subject: "test", html: "<p>test</p>" },
      "stable-job",
    ),
    (error: unknown) =>
      error instanceof EmailDeliveryError &&
      error.code === "provider_rate_limited" &&
      error.transient,
  );

  const provider = createBrevoEmailProvider(
    "test-key",
    (async (_url, init) => {
      capturedBody = String(init?.body ?? "");
      return new Response(JSON.stringify({ messageId: "<msg-1@brevo>" }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch,
  );
  assert.deepEqual(
    await provider.send(
      {
        from: "Fresh Prints <a@example.com>",
        to: "b@example.com",
        subject: "test",
        html: "<p>test</p>",
      },
      "stable-job",
    ),
    { provider: "brevo", providerMessageId: "<msg-1@brevo>" },
  );
  const parsed = JSON.parse(capturedBody) as {
    sender: { email: string; name?: string };
    htmlContent: string;
    headers: { idempotencyKey: string };
  };
  assert.deepEqual(parsed.sender, { email: "a@example.com", name: "Fresh Prints" });
  assert.equal(parsed.htmlContent, "<p>test</p>");
  assert.equal(parsed.headers.idempotencyKey, brevoIdempotencyKey("stable-job"));
});

test("email router and api key resolver select Brevo", async () => {
  assert.equal(
    resolveEmailApiKey("brevo", { resend: "r", brevo: "b" }),
    "b",
  );
  assert.equal(
    resolveEmailApiKey("resend", { resend: "r", brevo: "b" }),
    "r",
  );
  assert.throws(
    () => resolveEmailApiKey("brevo", { resend: "r", brevo: "  " }),
    (error: unknown) => error instanceof EmailDeliveryError && error.code === "provider_rejected",
  );

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ messageId: "brevo-msg" }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    })) as typeof fetch;
  try {
    assert.deepEqual(
      await sendEmail({
        provider: "brevo",
        apiKey: "test-key",
        idempotencyKey: "job-1",
        message: {
          from: "a@example.com",
          to: "b@example.com",
          subject: "test",
          html: "<p>x</p>",
        },
      }),
      { provider: "brevo", providerMessageId: "brevo-msg" },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
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
