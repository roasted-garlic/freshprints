import { doc, getDoc, serverTimestamp, setDoc, Timestamp } from "firebase/firestore";

import { runTracedWrite } from "@fresh-prints/shared/utils/firestoreUsageTrace";

import {
  DEFAULT_PORTAL_QUEUE_CUTOFF_HOURS_BEFORE_START,
  MAX_PORTAL_QUEUE_CUTOFF_HOURS_BEFORE_START,
  MIN_PORTAL_QUEUE_CUTOFF_HOURS_BEFORE_START,
  isValidPortalQueueCutoffHours,
} from "@fresh-prints/shared/utils/showQueueCutoff";

import { db } from "../../../config/firebase";
import { assertNoUndefinedFirestoreFields, withoutUndefinedFields } from "../../firebase/utils/firestoreDocument";
import { permissionService } from "../../permissions/services/permissionService";
import type { User } from "../../users/types/user.types";

const SHOW_QUEUE_SETTINGS_DOC_ID = "showQueue";

export type WhatnotAssistedImportStatus = "succeeded" | "failed";

export {
  DEFAULT_PORTAL_QUEUE_CUTOFF_HOURS_BEFORE_START,
  MAX_PORTAL_QUEUE_CUTOFF_HOURS_BEFORE_START,
  MIN_PORTAL_QUEUE_CUTOFF_HOURS_BEFORE_START,
};

export interface WhatnotAssistedImportSummary {
  created: number;
  updated: number;
  unchanged: number;
  skipped: number;
}

export interface ShowQueueSettings {
  /** Applied to newly created shows only; existing shows are never retroactively changed. */
  defaultMaxTotalQuantity?: number;
  updatedBy?: string;
  /** Staff-configurable; defaults to the hardcoded constant client-side when unset. */
  whatnotShowBaseUrl?: string;
  /**
   * Hours before show start when Portal customers can no longer Add to Show.
   * Default 5 when unset (ADR-FP-103). Portal-only; Studio staff allocation unchanged.
   */
  portalQueueCutoffHoursBeforeStart?: number;
  lastWhatnotAssistedImportAt?: Timestamp;
  lastWhatnotAssistedImportStatus?: WhatnotAssistedImportStatus;
  lastWhatnotAssistedImportSummary?: WhatnotAssistedImportSummary;
  lastWhatnotAssistedImportError?: string;
  /** Gang sheet artboard width in inches; defaults to `DEFAULT_GANG_SHEET_WIDTH_INCHES` when unset. */
  gangSheetWidthInches?: number;
  /** Sheet edge to nearest image, left/right only; defaults to `DEFAULT_GANG_SHEET_SIDE_MARGIN_INCHES`. */
  gangSheetSideMarginInches?: number;
  /** Sheet edge to nearest image, top/bottom only; defaults to `DEFAULT_GANG_SHEET_TOP_BOTTOM_MARGIN_INCHES`. */
  gangSheetTopBottomMarginInches?: number;
  /** Image-to-image spacing, both within a row and between rows; defaults to `DEFAULT_GANG_SHEET_GUTTER_INCHES`. */
  gangSheetGutterInches?: number;
  /** Height cap before starting a new sheet; defaults to `DEFAULT_GANG_SHEET_MAX_LENGTH_INCHES`. */
  gangSheetMaxLengthInches?: number;
  /** Sheet label text font size in pixels; defaults to `DEFAULT_GANG_SHEET_LABEL_FONT_SIZE_PX`. */
  gangSheetLabelFontSizePx?: number;
}

export const DEFAULT_GANG_SHEET_WIDTH_INCHES = 23;
export const MIN_GANG_SHEET_WIDTH_INCHES = 10;
export const MAX_GANG_SHEET_WIDTH_INCHES = 60;

export const DEFAULT_GANG_SHEET_SIDE_MARGIN_INCHES = 0.25;
export const DEFAULT_GANG_SHEET_TOP_BOTTOM_MARGIN_INCHES = 0.5;
export const DEFAULT_GANG_SHEET_GUTTER_INCHES = 0.5;
export const MIN_GANG_SHEET_SPACING_INCHES = 0;
export const MAX_GANG_SHEET_SPACING_INCHES = 5;

export const DEFAULT_GANG_SHEET_MAX_LENGTH_INCHES = 300;
export const MIN_GANG_SHEET_MAX_LENGTH_INCHES = 10;
export const MAX_GANG_SHEET_MAX_LENGTH_INCHES = 300;

/** Doubled from the original hardcoded 60px label size, per staff feedback that it was too small. */
export const DEFAULT_GANG_SHEET_LABEL_FONT_SIZE_PX = 120;
export const MIN_GANG_SHEET_LABEL_FONT_SIZE_PX = 20;
export const MAX_GANG_SHEET_LABEL_FONT_SIZE_PX = 300;

function mapWhatnotAssistedImportSummary(value: unknown): WhatnotAssistedImportSummary | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const summary = value as Record<string, unknown>;

  if (
    typeof summary.created !== "number" ||
    typeof summary.updated !== "number" ||
    typeof summary.unchanged !== "number" ||
    typeof summary.skipped !== "number"
  ) {
    return undefined;
  }

  return {
    created: summary.created,
    updated: summary.updated,
    unchanged: summary.unchanged,
    skipped: summary.skipped,
  };
}

function mapShowQueueSettings(data: Record<string, unknown> | undefined): ShowQueueSettings {
  return {
    defaultMaxTotalQuantity:
      typeof data?.defaultMaxTotalQuantity === "number" ? data.defaultMaxTotalQuantity : undefined,
    updatedBy: typeof data?.updatedBy === "string" ? data.updatedBy : undefined,
    whatnotShowBaseUrl: typeof data?.whatnotShowBaseUrl === "string" ? data.whatnotShowBaseUrl : undefined,
    portalQueueCutoffHoursBeforeStart:
      typeof data?.portalQueueCutoffHoursBeforeStart === "number"
        ? data.portalQueueCutoffHoursBeforeStart
        : undefined,
    lastWhatnotAssistedImportAt:
      data?.lastWhatnotAssistedImportAt instanceof Timestamp ? data.lastWhatnotAssistedImportAt : undefined,
    lastWhatnotAssistedImportStatus:
      data?.lastWhatnotAssistedImportStatus === "succeeded" || data?.lastWhatnotAssistedImportStatus === "failed"
        ? data.lastWhatnotAssistedImportStatus
        : undefined,
    lastWhatnotAssistedImportSummary: mapWhatnotAssistedImportSummary(data?.lastWhatnotAssistedImportSummary),
    lastWhatnotAssistedImportError:
      typeof data?.lastWhatnotAssistedImportError === "string" ? data.lastWhatnotAssistedImportError : undefined,
    gangSheetWidthInches: typeof data?.gangSheetWidthInches === "number" ? data.gangSheetWidthInches : undefined,
    gangSheetSideMarginInches:
      typeof data?.gangSheetSideMarginInches === "number" ? data.gangSheetSideMarginInches : undefined,
    gangSheetTopBottomMarginInches:
      typeof data?.gangSheetTopBottomMarginInches === "number" ? data.gangSheetTopBottomMarginInches : undefined,
    gangSheetGutterInches:
      typeof data?.gangSheetGutterInches === "number" ? data.gangSheetGutterInches : undefined,
    gangSheetMaxLengthInches:
      typeof data?.gangSheetMaxLengthInches === "number" ? data.gangSheetMaxLengthInches : undefined,
    gangSheetLabelFontSizePx:
      typeof data?.gangSheetLabelFontSizePx === "number" ? data.gangSheetLabelFontSizePx : undefined,
  };
}

function isWithinRange(value: number | undefined, min: number, max: number): boolean {
  return value === undefined || (value >= min && value <= max);
}

export const showQueueSettingsService = {
  async getSettings(): Promise<ShowQueueSettings> {
    const snapshot = await getDoc(doc(db, "settings", SHOW_QUEUE_SETTINGS_DOC_ID));
    return mapShowQueueSettings(snapshot.data());
  },

  async updateSettings(
    caller: User,
    input: {
      defaultMaxTotalQuantity?: number;
      whatnotShowBaseUrl?: string;
      portalQueueCutoffHoursBeforeStart?: number;
      gangSheetWidthInches?: number;
      gangSheetSideMarginInches?: number;
      gangSheetTopBottomMarginInches?: number;
      gangSheetGutterInches?: number;
      gangSheetMaxLengthInches?: number;
      gangSheetLabelFontSizePx?: number;
    },
  ): Promise<ShowQueueSettings> {
    if (!permissionService.canManageUpcomingShows(caller)) {
      throw new Error("You do not have permission to manage Show Queue settings.");
    }

    if (
      input.portalQueueCutoffHoursBeforeStart !== undefined &&
      !isValidPortalQueueCutoffHours(input.portalQueueCutoffHoursBeforeStart)
    ) {
      throw new Error(
        `Portal add cutoff must be a whole number between ${MIN_PORTAL_QUEUE_CUTOFF_HOURS_BEFORE_START} and ${MAX_PORTAL_QUEUE_CUTOFF_HOURS_BEFORE_START} hours.`,
      );
    }

    if (!isWithinRange(input.gangSheetWidthInches, MIN_GANG_SHEET_WIDTH_INCHES, MAX_GANG_SHEET_WIDTH_INCHES)) {
      throw new Error(
        `Gang sheet width must be between ${MIN_GANG_SHEET_WIDTH_INCHES}" and ${MAX_GANG_SHEET_WIDTH_INCHES}".`,
      );
    }

    if (
      !isWithinRange(input.gangSheetSideMarginInches, MIN_GANG_SHEET_SPACING_INCHES, MAX_GANG_SHEET_SPACING_INCHES) ||
      !isWithinRange(
        input.gangSheetTopBottomMarginInches,
        MIN_GANG_SHEET_SPACING_INCHES,
        MAX_GANG_SHEET_SPACING_INCHES,
      ) ||
      !isWithinRange(input.gangSheetGutterInches, MIN_GANG_SHEET_SPACING_INCHES, MAX_GANG_SHEET_SPACING_INCHES)
    ) {
      throw new Error(
        `Gang sheet spacing values must be between ${MIN_GANG_SHEET_SPACING_INCHES}" and ${MAX_GANG_SHEET_SPACING_INCHES}".`,
      );
    }

    if (
      !isWithinRange(
        input.gangSheetMaxLengthInches,
        MIN_GANG_SHEET_MAX_LENGTH_INCHES,
        MAX_GANG_SHEET_MAX_LENGTH_INCHES,
      )
    ) {
      throw new Error(
        `Gang sheet max length must be between ${MIN_GANG_SHEET_MAX_LENGTH_INCHES}" and ${MAX_GANG_SHEET_MAX_LENGTH_INCHES}".`,
      );
    }

    if (
      !isWithinRange(
        input.gangSheetLabelFontSizePx,
        MIN_GANG_SHEET_LABEL_FONT_SIZE_PX,
        MAX_GANG_SHEET_LABEL_FONT_SIZE_PX,
      )
    ) {
      throw new Error(
        `Gang sheet label font size must be between ${MIN_GANG_SHEET_LABEL_FONT_SIZE_PX}px and ${MAX_GANG_SHEET_LABEL_FONT_SIZE_PX}px.`,
      );
    }

    const payload = withoutUndefinedFields({
      defaultMaxTotalQuantity: input.defaultMaxTotalQuantity,
      whatnotShowBaseUrl: input.whatnotShowBaseUrl,
      portalQueueCutoffHoursBeforeStart: input.portalQueueCutoffHoursBeforeStart,
      gangSheetWidthInches: input.gangSheetWidthInches,
      gangSheetSideMarginInches: input.gangSheetSideMarginInches,
      gangSheetTopBottomMarginInches: input.gangSheetTopBottomMarginInches,
      gangSheetGutterInches: input.gangSheetGutterInches,
      gangSheetMaxLengthInches: input.gangSheetMaxLengthInches,
      gangSheetLabelFontSizePx: input.gangSheetLabelFontSizePx,
      updatedBy: caller.id,
      updatedAt: serverTimestamp(),
    });

    assertNoUndefinedFirestoreFields(payload, "Show Queue settings payload");
    await runTracedWrite(
      "setDoc",
      () => setDoc(doc(db, "settings", SHOW_QUEUE_SETTINGS_DOC_ID), payload, { merge: true }),
      {
        app: "studio",
        collection: "settings",
        documentPathPattern: "settings/showQueue",
        source: "showQueueSettingsService.updateSettings",
      },
    );

    return this.getSettings();
  },

  /** Records the outcome of a staff-assisted Whatnot import. Never called by the settings-editing UI. */
  async recordWhatnotAssistedImportResult(
    caller: User,
    result:
      | { status: "succeeded"; summary: WhatnotAssistedImportSummary }
      | { status: "failed"; error: string },
  ): Promise<ShowQueueSettings> {
    if (!permissionService.canImportWhatnotShows(caller)) {
      throw new Error("You do not have permission to import shows from Whatnot.");
    }

    const payload = withoutUndefinedFields({
      lastWhatnotAssistedImportAt: serverTimestamp(),
      lastWhatnotAssistedImportStatus: result.status,
      lastWhatnotAssistedImportSummary: result.status === "succeeded" ? result.summary : undefined,
      lastWhatnotAssistedImportError: result.status === "failed" ? result.error : undefined,
      updatedBy: caller.id,
      updatedAt: serverTimestamp(),
    });

    assertNoUndefinedFirestoreFields(payload, "Whatnot assisted import result payload");
    await runTracedWrite(
      "setDoc",
      () => setDoc(doc(db, "settings", SHOW_QUEUE_SETTINGS_DOC_ID), payload, { merge: true }),
      {
        app: "studio",
        collection: "settings",
        documentPathPattern: "settings/showQueue",
        source: "showQueueSettingsService.recordWhatnotAssistedImportResult",
      },
    );

    return this.getSettings();
  },
};
