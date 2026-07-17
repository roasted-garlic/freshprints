export const EMAIL_PROVIDER_SETTINGS_DOC_ID = "emailProviders";
export const EMAIL_DELIVERY_JOBS_COLLECTION = "emailDeliveryJobs";

export const EMAIL_PROVIDER_IDS = ["resend"] as const;
export type EmailProviderId = (typeof EMAIL_PROVIDER_IDS)[number];

export interface EmailProviderSettings {
  inviteProvider: EmailProviderId;
  proofNoticeProvider: EmailProviderId;
  updatedAt?: unknown;
  updatedBy?: string;
}

export const DEFAULT_EMAIL_PROVIDER_SETTINGS: Readonly<EmailProviderSettings> = {
  inviteProvider: "resend",
  proofNoticeProvider: "resend",
};

export function isEmailProviderId(value: unknown): value is EmailProviderId {
  return value === "resend";
}

export function resolveEmailProviderId(value: unknown): EmailProviderId {
  return isEmailProviderId(value) ? value : DEFAULT_EMAIL_PROVIDER_SETTINGS.inviteProvider;
}

export function resolveEmailProviderSettings(value: unknown): EmailProviderSettings {
  const data = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  const settings: EmailProviderSettings = {
    inviteProvider: resolveEmailProviderId(data.inviteProvider),
    proofNoticeProvider: resolveEmailProviderId(data.proofNoticeProvider),
  };
  if (data.updatedAt !== undefined) {
    settings.updatedAt = data.updatedAt;
  }
  if (typeof data.updatedBy === "string") {
    settings.updatedBy = data.updatedBy;
  }
  return settings;
}
