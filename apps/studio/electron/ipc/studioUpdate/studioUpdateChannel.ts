import type { StudioUpdateChannel } from "@fresh-prints/shared/types/studioUpdate/studioUpdateIpc.types";

/**
 * Packaged builds select their update channel via this env var, baked in at build/publish time
 * (see .github/workflows/studio-release.yml). Absent or unrecognized values fall back to "stable"
 * so a misconfigured build never accidentally offers prerelease updates to production users.
 */
export function resolveStudioUpdateChannel(): StudioUpdateChannel {
  return process.env.FRESH_PRINTS_UPDATE_CHANNEL === "prerelease" ? "prerelease" : "stable";
}
