import type { StudioUpdateChannel } from "@fresh-prints/shared/types/studioUpdate/studioUpdateIpc.types";
import { PACKAGED_UPDATE_CHANNEL } from "../../generated/packagedBuildConfig";

/**
 * Packaged builds select their update channel via a build-time generated constant
 * (apps/studio/electron/generated/packagedBuildConfig.ts, produced by
 * apps/studio/scripts/generate-packaged-build-config.mjs from the FRESH_PRINTS_UPDATE_CHANNEL
 * environment variable available only during the build itself), not a runtime environment
 * variable. An installed application has no such variable when it launches — the previous
 * runtime-env-var approach silently made every packaged build report "stable" regardless of how
 * it was actually built.
 */
export function resolveStudioUpdateChannel(): StudioUpdateChannel {
  return PACKAGED_UPDATE_CHANNEL === "prerelease" ? "prerelease" : "stable";
}
