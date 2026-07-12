import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "../../auth/hooks/useAuth";
import { permissionService } from "../../permissions/services/permissionService";
import { gangSheetService } from "../services/gangSheetService";
import { canPlaceAnotherCopy } from "@fresh-prints/shared/utils/gangSheetItemQuantity";
import { rotateRectByCardinalDegrees, type RectInches } from "@fresh-prints/shared/utils/gangSheetLayoutUnits";
import { overlapsAnyOtherItem } from "@fresh-prints/shared/utils/gangSheetLayoutCollision";
import type { GangSheet, GangSheetItem } from "@fresh-prints/shared/types/gangSheet/gangSheet.types";
import type { GangSheetShowAsset } from "./useGangSheetShowAssets";

const DEFAULT_PLACED_WIDTH_INCHES = 3;
const PLACEMENT_SEARCH_STEP_INCHES = 0.5;

type ItemTransform = Pick<
  GangSheetItem,
  "xInches" | "yInches" | "widthInches" | "heightInches" | "rotationDegrees" | "flipHorizontal" | "flipVertical"
>;

interface GangSheetBuilderState {
  gangSheet: GangSheet | null;
  items: GangSheetItem[];
  error: string | null;
  isLoading: boolean;
}

const initialState: GangSheetBuilderState = {
  gangSheet: null,
  items: [],
  error: null,
  isLoading: true,
};

function formatError(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function toRect(item: Pick<GangSheetItem, "xInches" | "yInches" | "widthInches" | "heightInches">): RectInches {
  return {
    xInches: item.xInches,
    yInches: item.yInches,
    widthInches: item.widthInches,
    heightInches: item.heightInches,
  };
}

function toTransform(item: GangSheetItem): ItemTransform {
  return {
    xInches: item.xInches,
    yInches: item.yInches,
    widthInches: item.widthInches,
    heightInches: item.heightInches,
    rotationDegrees: item.rotationDegrees,
    flipHorizontal: item.flipHorizontal,
    flipVertical: item.flipVertical,
  };
}

/**
 * Finds the first left-to-right, top-to-bottom, non-overlapping spot on the sheet for a new
 * item's size. This is only so newly placed items do not all land stacked at the origin now that
 * overlap is blocked — it is not the Auto Builder layout pass (a separate, not-yet-approved slice).
 */
function findNonOverlappingOrigin(
  widthInches: number,
  heightInches: number,
  sheetWidthInches: number,
  sheetHeightInches: number,
  existingItems: GangSheetItem[],
): { xInches: number; yInches: number } {
  const others = existingItems.map((item) => ({ id: item.id, ...toRect(item) }));

  for (let yInches = 0; yInches <= Math.max(0, sheetHeightInches - heightInches); yInches += PLACEMENT_SEARCH_STEP_INCHES) {
    for (let xInches = 0; xInches <= Math.max(0, sheetWidthInches - widthInches); xInches += PLACEMENT_SEARCH_STEP_INCHES) {
      const candidate = { xInches, yInches, widthInches, heightInches };

      if (!overlapsAnyOtherItem(candidate, "__new__", others)) {
        return { xInches, yInches };
      }
    }
  }

  return { xInches: 0, yInches: 0 };
}

export function useGangSheetBuilder(upcomingShowId: string | null) {
  const { user } = useAuth();
  const [state, setState] = useState<GangSheetBuilderState>(initialState);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Last server-confirmed transform per item, keyed by item id. Used to revert an invalid
  // in-progress drag/resize without needing another network round-trip, and to know what to
  // persist when a `<Rnd>` interaction commits (onDragStop/onResizeStop).
  const committedItemsRef = useRef<Map<string, GangSheetItem>>(new Map());

  const load = useCallback(async () => {
    if (!user || !permissionService.canManageUpcomingShows(user) || !upcomingShowId) {
      setState({ gangSheet: null, items: [], error: null, isLoading: false });
      return;
    }

    setState((current) => ({ ...current, isLoading: true, error: null }));

    try {
      const gangSheet = await gangSheetService.getOrCreateLatestGangSheetForShow(user, upcomingShowId);
      const items = await gangSheetService.listGangSheetItems(user, gangSheet.id);
      committedItemsRef.current = new Map(items.map((item) => [item.id, item]));
      setState({ gangSheet, items, error: null, isLoading: false });
    } catch (error) {
      setState({
        gangSheet: null,
        items: [],
        error: formatError(error, "Unable to load the gang sheet builder."),
        isLoading: false,
      });
    }
  }, [upcomingShowId, user]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedItem = useMemo(
    () => state.items.find((item) => item.id === selectedItemId) ?? null,
    [selectedItemId, state.items],
  );

  const placeAsset = useCallback(
    async (asset: GangSheetShowAsset, copyIndex: number) => {
      if (!user || !state.gangSheet || !upcomingShowId) {
        return;
      }

      const isUpload = Boolean(asset.upload) || asset.allocation.sourceType === "customer_upload";
      if (!isUpload && !asset.design) {
        return;
      }
      if (isUpload && (!asset.upload?.productionStoragePath || !asset.allocation.customerUploadId)) {
        setState((current) => ({
          ...current,
          error: "Uploaded artwork production file is missing.",
        }));
        return;
      }

      if (!canPlaceAnotherCopy(asset.allocation.allocatedQuantity, state.items, asset.allocation.id)) {
        setState((current) => ({
          ...current,
          error: "This item has already reached its allocated quantity for this show.",
        }));
        return;
      }

      const widthInches =
        asset.allocation.printWidthInches ??
        asset.upload?.printWidthInches ??
        DEFAULT_PLACED_WIDTH_INCHES;
      const pixelWidth = asset.design?.width ?? asset.upload?.widthPx ?? null;
      const pixelHeight = asset.design?.height ?? asset.upload?.heightPx ?? null;
      const heightInches =
        asset.allocation.printHeightInches ??
        asset.upload?.printHeightInches ??
        (pixelWidth && pixelHeight ? widthInches * (pixelHeight / pixelWidth) : widthInches);

      const origin = findNonOverlappingOrigin(
        widthInches,
        heightInches,
        state.gangSheet.sheetWidthInches,
        state.gangSheet.sheetHeightInches,
        state.items,
      );

      try {
        const created = await gangSheetService.addGangSheetItem(user, state.gangSheet.id, upcomingShowId, {
          showAllocationId: asset.allocation.id,
          printRequestId: asset.allocation.printRequestId,
          printRequestItemId: asset.allocation.printRequestItemId,
          ...(isUpload
            ? {
                sourceType: "customer_upload" as const,
                customerUploadId: asset.allocation.customerUploadId!,
              }
            : {
                designId: asset.allocation.designId!,
              }),
          copyIndex,
          sourceQuantitySnapshot: asset.allocation.allocatedQuantity,
          designTitleSnapshot:
            asset.design?.title ??
            asset.upload?.originalFilename ??
            asset.allocation.designTitleSnapshot,
          requestNameSnapshot: asset.allocation.requestNameSnapshot,
          originalPathSnapshot: isUpload
            ? asset.upload!.productionStoragePath!
            : asset.design!.originalPath,
          xInches: origin.xInches,
          yInches: origin.yInches,
          widthInches,
          heightInches,
          rotationDegrees: 0,
          flipHorizontal: false,
          flipVertical: false,
          zIndex: state.items.length,
        });

        committedItemsRef.current.set(created.id, created);
        setState((current) => ({
          ...current,
          items: [...current.items, created],
          error: null,
        }));
        setSelectedItemId(created.id);
      } catch (error) {
        setState((current) => ({ ...current, error: formatError(error, "Unable to place this item.") }));
      }
    },
    [state.gangSheet, state.items, upcomingShowId, user],
  );

  /**
   * Updates a placed item's transform in local state only — no Firestore write. Used while a
   * `<Rnd>` drag/resize is in progress (`onDrag`/`onResize`) so the canvas feels responsive
   * instead of waiting on a network round-trip for every frame of movement.
   */
  const previewItemTransform = useCallback((itemId: string, transform: Partial<ItemTransform>) => {
    setState((current) => ({
      ...current,
      items: current.items.map((item) => (item.id === itemId ? { ...item, ...transform } : item)),
    }));
  }, []);

  /**
   * Validates a candidate transform (non-overlapping) for `itemId` and, if valid, persists it.
   * If invalid, reverts local state back to the last server-confirmed transform and surfaces a
   * short user-visible message. Called once per interaction, on `<Rnd>`'s `onDragStop`/
   * `onResizeStop` — not on every drag/resize frame. Sheet-edge containment is enforced by the
   * `<Rnd>` item's own `bounds="parent"` prop, so this only needs to check overlap.
   */
  const commitItemTransform = useCallback(
    async (itemId: string, candidate: ItemTransform) => {
      const committed = committedItemsRef.current.get(itemId);

      if (!user || !committed) {
        return;
      }

      const overlaps = overlapsAnyOtherItem(
        toRect(candidate),
        itemId,
        state.items.map((item) => ({ id: item.id, ...toRect(item) })),
      );

      if (overlaps) {
        setState((current) => ({
          ...current,
          items: current.items.map((item) => (item.id === itemId ? committed : item)),
          error: "Items cannot overlap.",
        }));
        return;
      }

      try {
        const updated = await gangSheetService.updateGangSheetItemTransform(user, itemId, candidate);
        committedItemsRef.current.set(itemId, updated);
        setState((current) => ({
          ...current,
          items: current.items.map((item) => (item.id === updated.id ? updated : item)),
          error: null,
        }));
      } catch (error) {
        setState((current) => ({
          ...current,
          items: current.items.map((item) => (item.id === itemId ? committed : item)),
          error: formatError(error, "Unable to save this change."),
        }));
      }
    },
    [state.items, user],
  );

  /** Called from `<Rnd>`'s `onDrag` for smooth, non-persisted movement. */
  const previewItemPosition = useCallback(
    (itemId: string, xInches: number, yInches: number) => {
      previewItemTransform(itemId, { xInches, yInches });
    },
    [previewItemTransform],
  );

  /** Called from `<Rnd>`'s `onDragStop` to persist the final position. */
  const commitItemPosition = useCallback(
    async (itemId: string, xInches: number, yInches: number) => {
      const item = state.items.find((candidate) => candidate.id === itemId);

      if (!item) {
        return;
      }

      await commitItemTransform(itemId, { ...toTransform(item), xInches, yInches });
    },
    [commitItemTransform, state.items],
  );

  /** Called from `<Rnd>`'s `onResize` for smooth, non-persisted resizing. */
  const previewItemSize = useCallback(
    (itemId: string, widthInches: number, heightInches: number, xInches: number, yInches: number) => {
      previewItemTransform(itemId, { widthInches, heightInches, xInches, yInches });
    },
    [previewItemTransform],
  );

  /** Called from `<Rnd>`'s `onResizeStop` to persist the final size/position. */
  const commitItemSize = useCallback(
    async (itemId: string, widthInches: number, heightInches: number, xInches: number, yInches: number) => {
      const item = state.items.find((candidate) => candidate.id === itemId);

      if (!item) {
        return;
      }

      await commitItemTransform(itemId, { ...toTransform(item), widthInches, heightInches, xInches, yInches });
    },
    [commitItemTransform, state.items],
  );

  /**
   * Rotates the selected item by ±90°, matching the reference builder's 90°-increment-only model:
   * the box's own width/height are swapped so it stays axis-aligned in storage, and only the
   * rendered image content visually rotates via CSS. This sidesteps rotated-rectangle bounds and
   * collision math entirely.
   */
  const rotateSelectedItem = useCallback(
    async (deltaDegrees: 90 | -90) => {
      if (!selectedItem) {
        return;
      }

      const rotationDegrees = (selectedItem.rotationDegrees + deltaDegrees + 360) % 360;
      const rotatedRect = rotateRectByCardinalDegrees(toRect(selectedItem), deltaDegrees + 360);

      await commitItemTransform(selectedItem.id, {
        ...toTransform(selectedItem),
        ...rotatedRect,
        rotationDegrees,
      });
    },
    [commitItemTransform, selectedItem],
  );

  const flipSelectedItem = useCallback(
    async (axis: "horizontal" | "vertical") => {
      if (!selectedItem) {
        return;
      }

      await commitItemTransform(selectedItem.id, {
        ...toTransform(selectedItem),
        flipHorizontal: axis === "horizontal" ? !selectedItem.flipHorizontal : selectedItem.flipHorizontal,
        flipVertical: axis === "vertical" ? !selectedItem.flipVertical : selectedItem.flipVertical,
      });
    },
    [commitItemTransform, selectedItem],
  );

  const duplicateSelectedItem = useCallback(async () => {
    if (!user || !state.gangSheet || !upcomingShowId || !selectedItem) {
      return;
    }

    if (!canPlaceAnotherCopy(selectedItem.sourceQuantitySnapshot, state.items, selectedItem.showAllocationId)) {
      setState((current) => ({
        ...current,
        error: "This item has already reached its allocated quantity for this show.",
      }));
      return;
    }

    const origin = findNonOverlappingOrigin(
      selectedItem.widthInches,
      selectedItem.heightInches,
      state.gangSheet.sheetWidthInches,
      state.gangSheet.sheetHeightInches,
      state.items,
    );

    try {
      const created = await gangSheetService.addGangSheetItem(user, state.gangSheet.id, upcomingShowId, {
        showAllocationId: selectedItem.showAllocationId,
        printRequestId: selectedItem.printRequestId,
        printRequestItemId: selectedItem.printRequestItemId,
        designId: selectedItem.designId,
        copyIndex: state.items.filter((item) => item.showAllocationId === selectedItem.showAllocationId).length,
        sourceQuantitySnapshot: selectedItem.sourceQuantitySnapshot,
        designTitleSnapshot: selectedItem.designTitleSnapshot,
        requestNameSnapshot: selectedItem.requestNameSnapshot,
        originalPathSnapshot: selectedItem.originalPathSnapshot,
        xInches: origin.xInches,
        yInches: origin.yInches,
        widthInches: selectedItem.widthInches,
        heightInches: selectedItem.heightInches,
        rotationDegrees: selectedItem.rotationDegrees,
        flipHorizontal: selectedItem.flipHorizontal,
        flipVertical: selectedItem.flipVertical,
        zIndex: state.items.length,
      });

      committedItemsRef.current.set(created.id, created);
      setState((current) => ({ ...current, items: [...current.items, created], error: null }));
      setSelectedItemId(created.id);
    } catch (error) {
      setState((current) => ({ ...current, error: formatError(error, "Unable to duplicate this item.") }));
    }
  }, [selectedItem, state.gangSheet, state.items, upcomingShowId, user]);

  const deleteSelectedItem = useCallback(async () => {
    if (!user || !selectedItem || !state.gangSheet) {
      return;
    }

    try {
      await gangSheetService.removeGangSheetItem(user, state.gangSheet.id, selectedItem.id);
      committedItemsRef.current.delete(selectedItem.id);
      setState((current) => ({
        ...current,
        items: current.items.filter((item) => item.id !== selectedItem.id),
      }));
      setSelectedItemId(null);
    } catch (error) {
      setState((current) => ({ ...current, error: formatError(error, "Unable to delete this item.") }));
    }
  }, [selectedItem, state.gangSheet, user]);

  const updateSheetHeight = useCallback(
    async (sheetHeightInches: number) => {
      if (!user || !state.gangSheet) {
        return;
      }

      try {
        const updated = await gangSheetService.updateGangSheetSize(user, state.gangSheet.id, { sheetHeightInches });
        setState((current) => ({ ...current, gangSheet: updated }));
      } catch (error) {
        setState((current) => ({ ...current, error: formatError(error, "Unable to update sheet height.") }));
      }
    },
    [state.gangSheet, user],
  );

  const reload = useCallback(async () => {
    await load();
  }, [load]);

  return {
    gangSheet: state.gangSheet,
    items: state.items,
    error: state.error,
    isLoading: state.isLoading,
    selectedItemId,
    selectedItem,
    selectItem: setSelectedItemId,
    placeAsset,
    previewItemPosition,
    commitItemPosition,
    previewItemSize,
    commitItemSize,
    rotateSelectedItem,
    flipSelectedItem,
    duplicateSelectedItem,
    deleteSelectedItem,
    updateSheetHeight,
    reload,
  };
}
