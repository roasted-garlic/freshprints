import { FieldValue } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";

import {
  PORTAL_SOCIAL_META_SETTINGS_DOC_ID,
  parsePortalSocialMetaSettingsInput,
  resolvePortalSocialMetaSettings,
  type PortalSocialMetaSettings,
} from "../../packages/shared/src/constants/portal/portalSocialMetaSettings.constants";
import { adminDb } from "./lib/admin";
import { loadCallerProfile } from "./lib/caller";
import { invalidArgument, permissionDenied, unauthenticated } from "./lib/errors";

export const updatePortalSocialMetaSettings = onCall(
  async (request): Promise<PortalSocialMetaSettings> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }
    const caller = await loadCallerProfile(request.auth.uid);
    if (!caller.isActive || caller.role !== "owner") {
      throw permissionDenied("Only active owners can update Portal social sharing settings.");
    }

    const parsed = parsePortalSocialMetaSettingsInput(request.data);
    if (!parsed) {
      throw invalidArgument(
        "ogTitle, ogDescription, and valid image toggles are required within allowed limits.",
      );
    }

    const settings: PortalSocialMetaSettings = {
      ...parsed,
      updatedBy: request.auth.uid,
    };
    await adminDb.collection("settings").doc(PORTAL_SOCIAL_META_SETTINGS_DOC_ID).set({
      ...settings,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return resolvePortalSocialMetaSettings(settings);
  },
);
