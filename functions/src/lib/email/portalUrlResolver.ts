import { EmailDeliveryError } from "./email.types";

const PORTAL_BASE_URLS: Readonly<Record<string, string>> = {
  "fresh-prints-dev": "https://myprintrequest.dev",
  "fresh-prints-prod": "https://myprintrequest.com",
};

export function resolvePortalBaseUrl(input: {
  projectId?: string;
  override?: string;
  isEmulator?: boolean;
}): string {
  if (input.override) {
    const parsed = new URL(input.override);
    const localOverride =
      parsed.protocol === "http:" && ["localhost", "127.0.0.1"].includes(parsed.hostname);
    if (!input.isEmulator || !localOverride) {
      throw new EmailDeliveryError("portal_environment_unknown", false);
    }
    return parsed.toString().replace(/\/$/, "");
  }

  const resolved = input.projectId ? PORTAL_BASE_URLS[input.projectId] : undefined;
  if (!resolved) {
    throw new EmailDeliveryError("portal_environment_unknown", false);
  }
  return resolved;
}

function resolveDeployedOrEmulatorPortalBaseUrl(): string {
  return resolvePortalBaseUrl({
    projectId: process.env.GCLOUD_PROJECT ?? process.env.GOOGLE_CLOUD_PROJECT,
    override: process.env.FUNCTIONS_EMULATOR === "true" ? process.env.PORTAL_BASE_URL : undefined,
    isEmulator: process.env.FUNCTIONS_EMULATOR === "true",
  });
}

/** Firebase Auth action continue URL after Portal invite password create/reset. */
export function resolvePortalLoginContinueUrl(): string {
  return `${resolveDeployedOrEmulatorPortalBaseUrl()}/login`;
}

export function resolveProofReviewUrl(): string {
  return `${resolveDeployedOrEmulatorPortalBaseUrl()}/custom-designs?flow=assisted&step=status`;
}
