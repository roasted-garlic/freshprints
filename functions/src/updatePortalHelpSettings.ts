import { FieldValue } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";

import {
  PORTAL_HELP_SETTINGS_DOC_ID,
  parsePortalHelpSettingsInput,
  resolvePortalHelpSettings,
  type PortalHelpSettings,
} from "../../packages/shared/src/constants/portal/portalHelpSettings.constants";
import { adminDb } from "./lib/admin";
import { loadCallerProfile } from "./lib/caller";
import { invalidArgument, permissionDenied, unauthenticated } from "./lib/errors";

export const updatePortalHelpSettings = onCall(async (request): Promise<PortalHelpSettings> => {
  if (!request.auth?.uid) {
    throw unauthenticated();
  }
  const caller = await loadCallerProfile(request.auth.uid);
  if (!caller.isActive || !["owner", "admin"].includes(caller.role)) {
    throw permissionDenied("Only active owners and admins can update FAQ and How To settings.");
  }

  const parsed = parsePortalHelpSettingsInput(request.data);
  if (!parsed) {
    throw invalidArgument(
      "FAQ and How To settings are invalid. Check item limits, unique ids, and HTTPS YouTube/Vimeo video URLs.",
    );
  }

  const settings: PortalHelpSettings = {
    ...parsed,
    updatedBy: request.auth.uid,
  };
  await adminDb.collection("settings").doc(PORTAL_HELP_SETTINGS_DOC_ID).set({
    ...settings,
    updatedAt: FieldValue.serverTimestamp(),
  });
  return resolvePortalHelpSettings(settings);
});
