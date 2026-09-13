import { failedPrecondition } from "./errors";

export const DEV_FIXTURE_ALLOWED_PROJECT_ID = "fresh-prints-dev";

export function resolveTrustedProjectId(): string {
  return (process.env.GCLOUD_PROJECT ?? process.env.GOOGLE_CLOUD_PROJECT ?? "").trim();
}

export function assertDevFixtureProjectAllowed(): void {
  if (resolveTrustedProjectId() !== DEV_FIXTURE_ALLOWED_PROJECT_ID) {
    throw failedPrecondition("DEV fixture shows are only available on fresh-prints-dev.");
  }
}
