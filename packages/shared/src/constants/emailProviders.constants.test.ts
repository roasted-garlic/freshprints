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

test("only resend is accepted as an implemented provider", () => {
  assert.equal(isEmailProviderId("resend"), true);
  assert.equal(isEmailProviderId("brevo"), false);
  assert.deepEqual(resolveEmailProviderSettings({ inviteProvider: "brevo" }), {
    inviteProvider: "resend",
    proofNoticeProvider: "resend",
  });
});
