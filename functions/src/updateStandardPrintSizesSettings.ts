import { FieldValue } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";

import {
  STANDARD_PRINT_SIZES_SETTINGS_DOC_ID,
  parseStandardPrintSizesSettingsInput,
  resolveStandardPrintSizesSettings,
  type StandardPrintSizesSettings,
} from "../../packages/shared/src/constants/printSize/standardPrintSizesSettings.constants";
import { adminDb } from "./lib/admin";
import { loadCallerProfile } from "./lib/caller";
import { invalidArgument, permissionDenied, unauthenticated } from "./lib/errors";

export const updateStandardPrintSizesSettings = onCall(
  async (request): Promise<StandardPrintSizesSettings> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }
    const caller = await loadCallerProfile(request.auth.uid);
    if (!caller.isActive || caller.role !== "owner") {
      throw permissionDenied("Only active owners can update standard print sizes.");
    }

    const parsed = parseStandardPrintSizesSettingsInput(request.data);
    if (!parsed) {
      throw invalidArgument(
        "Standard print sizes must preserve the approved placement/group structure with valid preset widths.",
      );
    }

    await adminDb.collection("settings").doc(STANDARD_PRINT_SIZES_SETTINGS_DOC_ID).set({
      version: parsed.version,
      placements: parsed.placements,
      updatedBy: request.auth.uid,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return resolveStandardPrintSizesSettings(parsed);
  },
);
