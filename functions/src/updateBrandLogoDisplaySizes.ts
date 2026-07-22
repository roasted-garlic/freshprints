import { FieldValue } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";

import {
  BRAND_LOGO_DISPLAY_SIZE_MAX_PX,
  BRAND_LOGO_DISPLAY_SIZE_MIN_PX,
  BRAND_LOGO_SETTINGS_DOC_ID,
  LEGACY_BRAND_LOGO_HEIGHT_FIELD_KEYS,
  parseBrandLogoDisplaySizesInput,
  resolveBrandLogoSettings,
  type BrandLogoSettings,
} from "../../packages/shared/src/constants/brand/brandLogoSettings.constants";
import { adminDb } from "./lib/admin";
import { loadCallerProfile } from "./lib/caller";
import { invalidArgument, permissionDenied, unauthenticated } from "./lib/errors";

export const updateBrandLogoDisplaySizes = onCall(async (request): Promise<BrandLogoSettings> => {
  if (!request.auth?.uid) {
    throw unauthenticated();
  }
  const caller = await loadCallerProfile(request.auth.uid);
  if (!caller.isActive || caller.role !== "owner") {
    throw permissionDenied("Only active owners can update brand logo display sizes.");
  }

  const parsed = parseBrandLogoDisplaySizesInput(request.data);
  if (!parsed) {
    throw invalidArgument(
      `Each placement needs widthPx and heightPx as integers from ${BRAND_LOGO_DISPLAY_SIZE_MIN_PX} to ${BRAND_LOGO_DISPLAY_SIZE_MAX_PX}.`,
    );
  }

  const legacyDeletes = Object.fromEntries(
    LEGACY_BRAND_LOGO_HEIGHT_FIELD_KEYS.map((key) => [key, FieldValue.delete()]),
  );

  const docRef = adminDb.collection("settings").doc(BRAND_LOGO_SETTINGS_DOC_ID);
  const existingSnap = await docRef.get();
  await docRef.set(
    {
      ...parsed,
      ...legacyDeletes,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: request.auth.uid,
    },
    { merge: true },
  );

  // Return a plain resolved object (no Admin Timestamps) so the callable payload stays JSON-safe.
  return resolveBrandLogoSettings({
    ...(existingSnap.data() ?? {}),
    ...parsed,
    updatedBy: request.auth.uid,
  });
});
