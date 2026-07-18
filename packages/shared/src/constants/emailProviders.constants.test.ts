import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_EMAIL_PROVIDER_SETTINGS,
  isEmailProviderId,
  resolveEmailProviderSettings,
} from "./emailProviders.constants";

test("email provider settings default to resend", () => {
  assert.deepEqual(resolveEmailProviderSettings(undefined), DEFAULT_EMAIL_PROVIDER_SETTINGS);
});

test("resend and brevo are accepted as implemented providers", () => {
  assert.equal(isEmailProviderId("resend"), true);
  assert.equal(isEmailProviderId("brevo"), true);
  assert.equal(isEmailProviderId("smtp"), false);
  assert.deepEqual(resolveEmailProviderSettings({ inviteProvider: "brevo" }), {
    inviteProvider: "brevo",
    proofNoticeProvider: "resend",
  });
  assert.deepEqual(
    resolveEmailProviderSettings({
      inviteProvider: "brevo",
      proofNoticeProvider: "brevo",
    }),
    {
      inviteProvider: "brevo",
      proofNoticeProvider: "brevo",
    },
  );
  assert.deepEqual(resolveEmailProviderSettings({ inviteProvider: "unknown" }), {
    inviteProvider: "resend",
    proofNoticeProvider: "resend",
  });
});
