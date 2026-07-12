import {
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
} from "firebase/firestore";

import { db } from "../../../config/firebase";
import { mapFirestoreTimestamp, resolveDesignDocumentTimestamps } from "../../firebase/utils/firestoreTimestamp";
import { assertNoUndefinedFirestoreFields, withoutUndefinedFields } from "../../firebase/utils/firestoreDocument";
import { firestoreCollectionService } from "../../firebase/services/firestoreCollectionService";
import { permissionService } from "../../permissions/services/permissionService";
import type { User } from "../../users/types/user.types";
import type { GangSheetStatus } from "@fresh-prints/shared/types/gangSheet/gangSheet.enums";
import type { GangSheet, GangSheetItem } from "@fresh-prints/shared/types/gangSheet/gangSheet.types";

const DEFAULT_SHEET_WIDTH_INCHES = 22;
const DEFAULT_SHEET_HEIGHT_INCHES = 12;
const DEFAULT_DPI = 300;
const DEFAULT_SHEET_NUMBER = 1;

const VALID_GANG_SHEET_STATUSES: GangSheetStatus[] = [
  "draft",
  "ready",
  "printing",
  "paused",
  "finished",
  "archived",
];

function isGangSheetStatus(value: unknown): value is GangSheetStatus {
  return typeof value === "string" && VALID_GANG_SHEET_STATUSES.includes(value as GangSheetStatus);
}

interface GangSheetDocumentData extends DocumentData {
  upcomingShowId?: unknown;
  title?: unknown;
  status?: unknown;
  sheetWidthInches?: unknown;
  sheetHeightInches?: unknown;
  dpi?: unknown;
  backgroundColor?: unknown;
  itemCount?: unknown;
  totalQuantity?: unknown;
  accumulatedPrintMs?: unknown;
  activePrintStartedAt?: unknown;
  printStartedAt?: unknown;
  printPausedAt?: unknown;
  printFinishedAt?: unknown;
  printFinishedBy?: unknown;
  lastResetAt?: unknown;
  lastResetBy?: unknown;
  lastExportedAt?: unknown;
  lastExportedBy?: unknown;
  lastExportFileName?: unknown;
  sheetNumber?: unknown;
  createdBy?: unknown;
  updatedBy?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
}

interface GangSheetItemDocumentData extends DocumentData {
  gangSheetId?: unknown;
  upcomingShowId?: unknown;
  showAllocationId?: unknown;
  printRequestId?: unknown;
  printRequestItemId?: unknown;
  designId?: unknown;
  sourceType?: unknown;
  customerUploadId?: unknown;
  copyIndex?: unknown;
  sourceQuantitySnapshot?: unknown;
  designTitleSnapshot?: unknown;
  requestNameSnapshot?: unknown;
  originalPathSnapshot?: unknown;
  xInches?: unknown;
  yInches?: unknown;
  widthInches?: unknown;
  heightInches?: unknown;
  rotationDegrees?: unknown;
  flipHorizontal?: unknown;
  flipVertical?: unknown;
  zIndex?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
}

function mapGangSheetData(gangSheetId: string, data: GangSheetDocumentData): GangSheet {
  // `createdAt`/`updatedAt` use serverTimestamp() sentinels that can still be null immediately
  // after a write, before the server-resolved value is echoed back — fall back to whichever of
  // the pair has resolved, same pattern as `mapDesignDocument`.
  const timestamps = resolveDesignDocumentTimestamps(data);

  if (
    typeof data.upcomingShowId !== "string" ||
    !isGangSheetStatus(data.status) ||
    typeof data.sheetWidthInches !== "number" ||
    typeof data.sheetHeightInches !== "number" ||
    typeof data.dpi !== "number" ||
    typeof data.itemCount !== "number" ||
    typeof data.totalQuantity !== "number" ||
    typeof data.accumulatedPrintMs !== "number" ||
    typeof data.sheetNumber !== "number" ||
    typeof data.createdBy !== "string" ||
    typeof data.updatedBy !== "string" ||
    timestamps === null
  ) {
    throw new Error("A gang sheet record is incomplete.");
  }

  return {
    id: gangSheetId,
    upcomingShowId: data.upcomingShowId,
    title: typeof data.title === "string" ? data.title : undefined,
    status: data.status,
    sheetWidthInches: data.sheetWidthInches,
    sheetHeightInches: data.sheetHeightInches,
    dpi: data.dpi,
    backgroundColor: typeof data.backgroundColor === "string" ? data.backgroundColor : undefined,
    itemCount: data.itemCount,
    totalQuantity: data.totalQuantity,
    accumulatedPrintMs: data.accumulatedPrintMs,
    activePrintStartedAt: mapFirestoreTimestamp(data.activePrintStartedAt),
    printStartedAt: mapFirestoreTimestamp(data.printStartedAt),
    printPausedAt: mapFirestoreTimestamp(data.printPausedAt),
    printFinishedAt: mapFirestoreTimestamp(data.printFinishedAt),
    printFinishedBy: typeof data.printFinishedBy === "string" ? data.printFinishedBy : undefined,
    lastResetAt: mapFirestoreTimestamp(data.lastResetAt),
    lastResetBy: typeof data.lastResetBy === "string" ? data.lastResetBy : undefined,
    lastExportedAt: mapFirestoreTimestamp(data.lastExportedAt),
    lastExportedBy: typeof data.lastExportedBy === "string" ? data.lastExportedBy : undefined,
    lastExportFileName: typeof data.lastExportFileName === "string" ? data.lastExportFileName : undefined,
    sheetNumber: data.sheetNumber,
    createdBy: data.createdBy,
    updatedBy: data.updatedBy,
    createdAt: timestamps.createdAt,
    updatedAt: timestamps.updatedAt,
  };
}

function mapGangSheetItemData(gangSheetItemId: string, data: GangSheetItemDocumentData): GangSheetItem {
  // Same serverTimestamp() resolution race as `mapGangSheetData` — a `getDoc` immediately
  // following `setDoc`/`updateDoc` can observe a still-pending sentinel on one of the pair.
  const timestamps = resolveDesignDocumentTimestamps(data);

  const sourceType =
    data.sourceType === "customer_upload" || data.sourceType === "catalog_design"
      ? data.sourceType
      : undefined;
  const customerUploadId =
    typeof data.customerUploadId === "string" && data.customerUploadId.trim()
      ? data.customerUploadId.trim()
      : undefined;
  const isUploadItem = sourceType === "customer_upload" || Boolean(customerUploadId);
  const designId =
    typeof data.designId === "string" && data.designId.trim() ? data.designId.trim() : undefined;

  if (
    typeof data.gangSheetId !== "string" ||
    typeof data.upcomingShowId !== "string" ||
    typeof data.showAllocationId !== "string" ||
    typeof data.printRequestId !== "string" ||
    typeof data.printRequestItemId !== "string" ||
    typeof data.copyIndex !== "number" ||
    typeof data.sourceQuantitySnapshot !== "number" ||
    typeof data.requestNameSnapshot !== "string" ||
    typeof data.originalPathSnapshot !== "string" ||
    typeof data.xInches !== "number" ||
    typeof data.yInches !== "number" ||
    typeof data.widthInches !== "number" ||
    typeof data.heightInches !== "number" ||
    typeof data.rotationDegrees !== "number" ||
    typeof data.flipHorizontal !== "boolean" ||
    typeof data.flipVertical !== "boolean" ||
    typeof data.zIndex !== "number" ||
    timestamps === null
  ) {
    throw new Error("A gang sheet item record is incomplete.");
  }

  if (isUploadItem) {
    if (!customerUploadId) {
      throw new Error("A gang sheet item record is incomplete.");
    }
  } else if (!designId) {
    throw new Error("A gang sheet item record is incomplete.");
  }

  return {
    id: gangSheetItemId,
    gangSheetId: data.gangSheetId,
    upcomingShowId: data.upcomingShowId,
    showAllocationId: data.showAllocationId,
    printRequestId: data.printRequestId,
    printRequestItemId: data.printRequestItemId,
    ...(designId ? { designId } : {}),
    ...(sourceType
      ? { sourceType }
      : isUploadItem
        ? { sourceType: "customer_upload" as const }
        : {}),
    ...(customerUploadId ? { customerUploadId } : {}),
    copyIndex: data.copyIndex,
    sourceQuantitySnapshot: data.sourceQuantitySnapshot,
    designTitleSnapshot: typeof data.designTitleSnapshot === "string" ? data.designTitleSnapshot : undefined,
    requestNameSnapshot: data.requestNameSnapshot,
    originalPathSnapshot: data.originalPathSnapshot,
    xInches: data.xInches,
    yInches: data.yInches,
    widthInches: data.widthInches,
    heightInches: data.heightInches,
    rotationDegrees: data.rotationDegrees,
    flipHorizontal: data.flipHorizontal,
    flipVertical: data.flipVertical,
    zIndex: data.zIndex,
    createdAt: timestamps.createdAt,
    updatedAt: timestamps.updatedAt,
  };
}

export interface CreateGangSheetItemInput {
  showAllocationId: string;
  printRequestId: string;
  printRequestItemId: string;
  designId?: string;
  sourceType?: "catalog_design" | "customer_upload";
  customerUploadId?: string;
  copyIndex: number;
  sourceQuantitySnapshot: number;
  designTitleSnapshot?: string;
  requestNameSnapshot: string;
  originalPathSnapshot: string;
  xInches: number;
  yInches: number;
  widthInches: number;
  heightInches: number;
  rotationDegrees: number;
  flipHorizontal: boolean;
  flipVertical: boolean;
  zIndex: number;
}

export interface UpdateGangSheetItemTransformInput {
  xInches?: number;
  yInches?: number;
  widthInches?: number;
  heightInches?: number;
  rotationDegrees?: number;
  flipHorizontal?: boolean;
  flipVertical?: boolean;
  zIndex?: number;
}

export const gangSheetService = {
  /**
   * Returns the most recently updated gang sheet for a show, or creates a new draft sheet at the
   * Slice 1 default size (`22 x 12` inches) if none exists yet. Slice 1 only ever has one sheet
   * per show, but `sheetNumber` is stored from the start for future multi-sheet support.
   */
  async getOrCreateLatestGangSheetForShow(caller: User, upcomingShowId: string): Promise<GangSheet> {
    if (!permissionService.canManageUpcomingShows(caller)) {
      throw new Error("You do not have permission to manage gang sheets.");
    }

    const existing = await this.listGangSheetsForShow(caller, upcomingShowId);

    if (existing.length > 0) {
      return existing[0];
    }

    const gangSheetRef = doc(firestoreCollectionService.getGangSheetsCollection());
    const createPayload = withoutUndefinedFields({
      upcomingShowId,
      status: "draft" as const,
      sheetWidthInches: DEFAULT_SHEET_WIDTH_INCHES,
      sheetHeightInches: DEFAULT_SHEET_HEIGHT_INCHES,
      dpi: DEFAULT_DPI,
      itemCount: 0,
      totalQuantity: 0,
      accumulatedPrintMs: 0,
      sheetNumber: DEFAULT_SHEET_NUMBER,
      createdBy: caller.id,
      updatedBy: caller.id,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    assertNoUndefinedFirestoreFields(createPayload, "Gang sheet create payload");
    await setDoc(gangSheetRef, createPayload);

    return this.getGangSheetById(caller, gangSheetRef.id);
  },

  async listGangSheetsForShow(caller: User, upcomingShowId: string): Promise<GangSheet[]> {
    if (!permissionService.canViewUpcomingShows(caller)) {
      return [];
    }

    const gangSheetsQuery = query(
      firestoreCollectionService.getGangSheetsCollection(),
      where("upcomingShowId", "==", upcomingShowId),
    );
    const snapshot = await getDocs(gangSheetsQuery);
    const gangSheets = snapshot.docs.map((gangSheetDoc) =>
      mapGangSheetData(gangSheetDoc.id, gangSheetDoc.data() as GangSheetDocumentData),
    );

    return gangSheets.sort((left, right) => right.updatedAt.toMillis() - left.updatedAt.toMillis());
  },

  async getGangSheetById(caller: User, gangSheetId: string): Promise<GangSheet> {
    if (!permissionService.canViewUpcomingShows(caller)) {
      throw new Error("You do not have permission to view gang sheets.");
    }

    const snapshot = await getDoc(doc(firestoreCollectionService.getGangSheetsCollection(), gangSheetId));

    if (!snapshot.exists()) {
      throw new Error("Gang sheet not found.");
    }

    return mapGangSheetData(snapshot.id, snapshot.data() as GangSheetDocumentData);
  },

  async updateGangSheetSize(
    caller: User,
    gangSheetId: string,
    input: { sheetWidthInches?: number; sheetHeightInches?: number },
  ): Promise<GangSheet> {
    if (!permissionService.canManageUpcomingShows(caller)) {
      throw new Error("You do not have permission to manage gang sheets.");
    }

    if (
      (input.sheetWidthInches !== undefined && input.sheetWidthInches <= 0) ||
      (input.sheetHeightInches !== undefined && input.sheetHeightInches <= 0)
    ) {
      throw new Error("Sheet dimensions must be positive.");
    }

    const gangSheetRef = doc(firestoreCollectionService.getGangSheetsCollection(), gangSheetId);
    const payload = withoutUndefinedFields({
      sheetWidthInches: input.sheetWidthInches,
      sheetHeightInches: input.sheetHeightInches,
      updatedBy: caller.id,
      updatedAt: serverTimestamp(),
    });

    assertNoUndefinedFirestoreFields(payload, "Gang sheet size update payload");
    await updateDoc(gangSheetRef, payload);

    return this.getGangSheetById(caller, gangSheetId);
  },

  async listGangSheetItems(caller: User, gangSheetId: string): Promise<GangSheetItem[]> {
    if (!permissionService.canViewUpcomingShows(caller)) {
      return [];
    }

    const itemsQuery = query(
      firestoreCollectionService.getGangSheetItemsCollection(),
      where("gangSheetId", "==", gangSheetId),
    );
    const snapshot = await getDocs(itemsQuery);

    // A single malformed item (e.g. a serverTimestamp() sentinel that has not resolved yet, or a
    // genuinely corrupt document) must not block the rest of the builder from loading. Quarantine
    // it: skip it from the returned layout and log for investigation, rather than throwing.
    const items: GangSheetItem[] = [];

    for (const itemDoc of snapshot.docs) {
      try {
        items.push(mapGangSheetItemData(itemDoc.id, itemDoc.data() as GangSheetItemDocumentData));
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error.";
        console.warn(`Skipping invalid gang sheet item ${itemDoc.id} (gangSheetId=${gangSheetId}): ${message}`);
      }
    }

    return items;
  },

  async addGangSheetItem(
    caller: User,
    gangSheetId: string,
    upcomingShowId: string,
    input: CreateGangSheetItemInput,
  ): Promise<GangSheetItem> {
    if (!permissionService.canManageUpcomingShows(caller)) {
      throw new Error("You do not have permission to manage gang sheets.");
    }

    const itemRef = doc(firestoreCollectionService.getGangSheetItemsCollection());
    const payload = withoutUndefinedFields({
      gangSheetId,
      upcomingShowId,
      showAllocationId: input.showAllocationId,
      printRequestId: input.printRequestId,
      printRequestItemId: input.printRequestItemId,
      designId: input.designId,
      sourceType: input.sourceType,
      customerUploadId: input.customerUploadId,
      copyIndex: input.copyIndex,
      sourceQuantitySnapshot: input.sourceQuantitySnapshot,
      designTitleSnapshot: input.designTitleSnapshot,
      requestNameSnapshot: input.requestNameSnapshot,
      originalPathSnapshot: input.originalPathSnapshot,
      xInches: input.xInches,
      yInches: input.yInches,
      widthInches: input.widthInches,
      heightInches: input.heightInches,
      rotationDegrees: input.rotationDegrees,
      flipHorizontal: input.flipHorizontal,
      flipVertical: input.flipVertical,
      zIndex: input.zIndex,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    assertNoUndefinedFirestoreFields(payload, "Gang sheet item create payload");
    await setDoc(itemRef, payload);

    await this.recalculateGangSheetTotals(caller, gangSheetId);

    const createdSnapshot = await getDoc(itemRef);
    return mapGangSheetItemData(createdSnapshot.id, createdSnapshot.data() as GangSheetItemDocumentData);
  },

  async updateGangSheetItemTransform(
    caller: User,
    gangSheetItemId: string,
    input: UpdateGangSheetItemTransformInput,
  ): Promise<GangSheetItem> {
    if (!permissionService.canManageUpcomingShows(caller)) {
      throw new Error("You do not have permission to manage gang sheets.");
    }

    const itemRef = doc(firestoreCollectionService.getGangSheetItemsCollection(), gangSheetItemId);
    const payload = withoutUndefinedFields({
      xInches: input.xInches,
      yInches: input.yInches,
      widthInches: input.widthInches,
      heightInches: input.heightInches,
      rotationDegrees: input.rotationDegrees,
      flipHorizontal: input.flipHorizontal,
      flipVertical: input.flipVertical,
      zIndex: input.zIndex,
      updatedAt: serverTimestamp(),
    });

    assertNoUndefinedFirestoreFields(payload, "Gang sheet item transform update payload");
    await updateDoc(itemRef, payload);

    const updatedSnapshot = await getDoc(itemRef);

    if (!updatedSnapshot.exists()) {
      throw new Error("Gang sheet item not found.");
    }

    return mapGangSheetItemData(updatedSnapshot.id, updatedSnapshot.data() as GangSheetItemDocumentData);
  },

  async removeGangSheetItem(caller: User, gangSheetId: string, gangSheetItemId: string): Promise<void> {
    if (!permissionService.canManageUpcomingShows(caller)) {
      throw new Error("You do not have permission to manage gang sheets.");
    }

    const batch = writeBatch(db);
    batch.delete(doc(firestoreCollectionService.getGangSheetItemsCollection(), gangSheetItemId));
    await batch.commit();

    await this.recalculateGangSheetTotals(caller, gangSheetId);
  },

  /**
   * Recomputes and persists `itemCount`/`totalQuantity` on the gang sheet from its current
   * placed items, mirroring the show's `recalculateShowAllocatedQuantity` pattern so denormalized
   * totals never drift from the underlying item records.
   */
  async recalculateGangSheetTotals(caller: User, gangSheetId: string): Promise<void> {
    const items = await this.listGangSheetItems(caller, gangSheetId);

    await updateDoc(doc(firestoreCollectionService.getGangSheetsCollection(), gangSheetId), {
      itemCount: items.length,
      totalQuantity: items.length,
      updatedBy: caller.id,
      updatedAt: serverTimestamp(),
    });
  },
};
