import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

import { runTracedWrite } from "@fresh-prints/shared/utils/firestoreUsageTrace";

import { db } from "../../../config/firebase";
import { assertNoUndefinedFirestoreFields, withoutUndefinedFields } from "../../firebase/utils/firestoreDocument";
import { permissionService } from "../../permissions/services/permissionService";
import type { User } from "../../users/types/user.types";

import {
  assertGangSheetLayoutAndPricingSettingsInput,
  type GangSheetLayoutAndPricingSettingsInput,
} from "./gangSheetSettingsFields";

const INTERNAL_GANG_SHEET_SETTINGS_DOC_ID = "internalGangSheet";

export type InternalGangSheetSettings = GangSheetLayoutAndPricingSettingsInput & {
  updatedBy?: string;
};

function mapInternalGangSheetSettings(data: Record<string, unknown> | undefined): InternalGangSheetSettings {
  return {
    gangSheetWidthInches: typeof data?.gangSheetWidthInches === "number" ? data.gangSheetWidthInches : undefined,
    gangSheetSideMarginInches:
      typeof data?.gangSheetSideMarginInches === "number" ? data.gangSheetSideMarginInches : undefined,
    gangSheetTopBottomMarginInches:
      typeof data?.gangSheetTopBottomMarginInches === "number" ? data.gangSheetTopBottomMarginInches : undefined,
    gangSheetGutterInches: typeof data?.gangSheetGutterInches === "number" ? data.gangSheetGutterInches : undefined,
    gangSheetMaxLengthInches:
      typeof data?.gangSheetMaxLengthInches === "number" ? data.gangSheetMaxLengthInches : undefined,
    gangSheetLabelFontSizePx:
      typeof data?.gangSheetLabelFontSizePx === "number" ? data.gangSheetLabelFontSizePx : undefined,
    gangSheetSectionPriceCutoffInches:
      typeof data?.gangSheetSectionPriceCutoffInches === "number"
        ? data.gangSheetSectionPriceCutoffInches
        : undefined,
    gangSheetSmallTierPriceUsd:
      typeof data?.gangSheetSmallTierPriceUsd === "number" ? data.gangSheetSmallTierPriceUsd : undefined,
    gangSheetSmallTierWeightOz:
      typeof data?.gangSheetSmallTierWeightOz === "number" ? data.gangSheetSmallTierWeightOz : undefined,
    gangSheetLargeTierPriceUsd:
      typeof data?.gangSheetLargeTierPriceUsd === "number" ? data.gangSheetLargeTierPriceUsd : undefined,
    gangSheetLargeTierWeightOz:
      typeof data?.gangSheetLargeTierWeightOz === "number" ? data.gangSheetLargeTierWeightOz : undefined,
    updatedBy: typeof data?.updatedBy === "string" ? data.updatedBy : undefined,
  };
}

export const internalGangSheetSettingsService = {
  async getSettings(): Promise<InternalGangSheetSettings> {
    const snapshot = await getDoc(doc(db, "settings", INTERNAL_GANG_SHEET_SETTINGS_DOC_ID));
    return mapInternalGangSheetSettings(snapshot.data());
  },

  async updateSettings(caller: User, input: GangSheetLayoutAndPricingSettingsInput): Promise<InternalGangSheetSettings> {
    if (!permissionService.canManageShowQueueSettings(caller)) {
      throw new Error("You do not have permission to manage Internal Gang Sheet settings.");
    }

    assertGangSheetLayoutAndPricingSettingsInput(input);

    const payload = withoutUndefinedFields({
      ...input,
      updatedBy: caller.id,
      updatedAt: serverTimestamp(),
    });

    assertNoUndefinedFirestoreFields(payload, "Internal Gang Sheet settings payload");
    await runTracedWrite(
      "setDoc",
      () => setDoc(doc(db, "settings", INTERNAL_GANG_SHEET_SETTINGS_DOC_ID), payload, { merge: true }),
      {
        app: "studio",
        collection: "settings",
        documentPathPattern: "settings/internalGangSheet",
        source: "internalGangSheetSettingsService.updateSettings",
      },
    );

    return mapInternalGangSheetSettings(payload as Record<string, unknown>);
  },
};
