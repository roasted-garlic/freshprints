import { useCallback, useMemo, useState } from "react";

import { ArrowLeft, Copy, FlipHorizontal, FlipVertical, RotateCw, Trash2, ZoomIn, ZoomOut } from "lucide-react";
import { Rnd, type RndDragCallback, type RndResizeCallback } from "react-rnd";
import { useNavigate, useParams } from "react-router-dom";

import { Badge } from "../../../shared/components/Badge";
import { Button } from "../../../shared/components/Button";
import { Card } from "../../../shared/components/Card";
import { EmptyState } from "../../../shared/components/EmptyState";
import { ErrorState } from "../../../shared/components/ErrorState";
import { LoadingSpinner } from "../../../shared/components/LoadingSpinner";
import { TextInput } from "../../../shared/components/TextInput";
import { useAuth } from "../../auth/hooks/useAuth";
import { permissionService } from "../../permissions/services/permissionService";
import { useUpcomingShows } from "../../upcoming-shows/hooks/useUpcomingShows";
import { formatUpcomingShowTitle } from "../../upcoming-shows/utils/upcomingShowDisplay";
import { getUpcomingShowsPath } from "../../upcoming-shows/constants/upcomingShowRoutes";
import { useGangSheetShowAssets } from "../hooks/useGangSheetShowAssets";
import { useGangSheetBuilder } from "../hooks/useGangSheetBuilder";
import { assessPlacedCopyAvailability } from "@fresh-prints/shared/utils/gangSheetItemQuantity";
import { inchesToPixels, pixelsToInches } from "@fresh-prints/shared/utils/gangSheetLayoutUnits";

const PIXELS_PER_INCH = 24;

const ZOOM_MIN = 0.25;
const ZOOM_MAX = 4;
const ZOOM_STEP = 0.25;
const ZOOM_PRESETS = [0.5, 0.75, 1, 1.5, 2, 3, 4];

export function GangSheetBuilderPage() {
  const { showId } = useParams<{ showId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { shows } = useUpcomingShows();
  const show = useMemo(() => shows.find((candidate) => candidate.id === showId) ?? null, [showId, shows]);

  const showAssets = useGangSheetShowAssets(showId ?? null);
  const builder = useGangSheetBuilder(showId ?? null);

  const [sheetHeightInput, setSheetHeightInput] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [showZoomPresets, setShowZoomPresets] = useState(false);

  const backToShowQueue = useCallback(() => {
    navigate(getUpcomingShowsPath(showId ? { showId } : undefined));
  }, [navigate, showId]);

  const thumbnailUrlByAllocationId = useMemo(
    () => new Map(showAssets.assets.map((asset) => [asset.allocation.id, asset.thumbnailUrl])),
    [showAssets.assets],
  );

  const availabilityByAllocationId = useMemo(() => {
    const availability = assessPlacedCopyAvailability(
      showAssets.assets.map((asset) => ({
        showAllocationId: asset.allocation.id,
        allocatedQuantity: asset.allocation.allocatedQuantity,
      })),
      builder.items,
    );

    return new Map(availability.map((entry) => [entry.showAllocationId, entry]));
  }, [builder.items, showAssets.assets]);

  const totalAllocated = showAssets.assets.reduce((sum, asset) => sum + asset.allocation.allocatedQuantity, 0);
  const totalPlaced = builder.items.length;

  const sheetWidthInches = builder.gangSheet?.sheetWidthInches ?? 22;
  const sheetHeightInches = builder.gangSheet?.sheetHeightInches ?? 12;
  const canvasWidthPx = inchesToPixels(sheetWidthInches, PIXELS_PER_INCH);
  const canvasHeightPx = inchesToPixels(sheetHeightInches, PIXELS_PER_INCH);

  const handlePlaceAsset = useCallback(
    (assetId: string) => {
      const asset = showAssets.assets.find((candidate) => candidate.allocation.id === assetId);

      if (!asset) {
        return;
      }

      const availability = availabilityByAllocationId.get(assetId);
      const nextCopyIndex = availability?.placedCount ?? 0;
      void builder.placeAsset(asset, nextCopyIndex);
    },
    [availabilityByAllocationId, builder, showAssets.assets],
  );

  const handleZoomOut = useCallback(() => {
    setZoom((current) => Math.max(ZOOM_MIN, Number((current - ZOOM_STEP).toFixed(2))));
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoom((current) => Math.min(ZOOM_MAX, Number((current + ZOOM_STEP).toFixed(2))));
  }, []);

  const handleSaveSheetHeight = useCallback(() => {
    if (sheetHeightInput === null) {
      return;
    }

    const parsed = Number(sheetHeightInput);

    if (Number.isFinite(parsed) && parsed > 0) {
      void builder.updateSheetHeight(parsed);
    }

    setSheetHeightInput(null);
  }, [builder, sheetHeightInput]);

  if (!permissionService.canManageUpcomingShows(user)) {
    return (
      <main className="page-layout page-layout-shell">
        <ErrorState message="You do not have permission to use the gang sheet builder." title="Not permitted" />
      </main>
    );
  }

  return (
    <main className="gang-sheet-builder-page">
      <header className="gang-sheet-builder-header">
        <div className="gang-sheet-builder-header-copy">
          <p className="eyebrow">Gang sheet builder</p>
          <h1>{show ? formatUpcomingShowTitle(show) : "Gang sheet"}</h1>
        </div>

        <div className="gang-sheet-builder-zoom-controls">
          <Button aria-label="Zoom out" onClick={handleZoomOut} size="sm" variant="secondary">
            <ZoomOut aria-hidden="true" size={16} strokeWidth={2} />
          </Button>
          <div className="gang-sheet-builder-zoom-value-wrapper">
            <button
              className="gang-sheet-builder-zoom-value"
              onClick={() => setShowZoomPresets((current) => !current)}
              type="button"
            >
              {Math.round(zoom * 100)}%
            </button>
            {showZoomPresets ? (
              <div className="gang-sheet-builder-zoom-presets">
                {ZOOM_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => {
                      setZoom(preset);
                      setShowZoomPresets(false);
                    }}
                    type="button"
                  >
                    {Math.round(preset * 100)}%
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <Button aria-label="Zoom in" onClick={handleZoomIn} size="sm" variant="secondary">
            <ZoomIn aria-hidden="true" size={16} strokeWidth={2} />
          </Button>
        </div>

        <Button onClick={backToShowQueue} size="sm" variant="secondary">
          <ArrowLeft aria-hidden="true" size={16} strokeWidth={2} />
          Back to Show Queue
        </Button>
      </header>

      {builder.error ? <ErrorState message={builder.error} title="Gang sheet error" /> : null}
      {showAssets.error ? <ErrorState message={showAssets.error} title="Unable to load show assets" /> : null}

      <div className="gang-sheet-builder-layout">
        <aside className="gang-sheet-builder-assets-panel">
          <p className="eyebrow">Show assets</p>
          {showAssets.isLoading ? (
            <LoadingSpinner label="Loading show assets" />
          ) : showAssets.assets.length === 0 ? (
            <EmptyState message="This show has no active allocations yet." title="No assets to place" />
          ) : (
            <div className="gang-sheet-builder-asset-grid">
              {showAssets.assets.map((asset) => {
                const availability = availabilityByAllocationId.get(asset.allocation.id);
                const remaining = availability?.remainingPlaceable ?? asset.allocation.allocatedQuantity;
                const isFull = remaining <= 0;

                return (
                  <button
                    className="gang-sheet-builder-asset-cell"
                    disabled={isFull}
                    key={asset.allocation.id}
                    onClick={() => handlePlaceAsset(asset.allocation.id)}
                    title={asset.design?.title ?? asset.allocation.designTitleSnapshot ?? "Design"}
                    type="button"
                  >
                    {asset.thumbnailUrl ? (
                      <img alt={asset.design?.title ?? "Design"} src={asset.thumbnailUrl} />
                    ) : (
                      <span className="gang-sheet-builder-asset-cell-fallback">No preview</span>
                    )}
                    <span className="gang-sheet-builder-asset-cell-overlay">{isFull ? "Fully placed" : "+ Add"}</span>
                    <span className="gang-sheet-builder-asset-cell-quantity">
                      {remaining} / {asset.allocation.allocatedQuantity}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </aside>

        <section className="gang-sheet-builder-canvas-section">
          <div className="gang-sheet-builder-toolbar">
            <span>
              {totalPlaced} placed / {totalAllocated} allocated
            </span>
            <Badge variant={totalPlaced > totalAllocated ? "danger" : "default"}>
              {sheetWidthInches}&quot; x {sheetHeightInches}&quot;
            </Badge>
          </div>

          {builder.isLoading ? (
            <Card className="print-requests-loading-card">
              <LoadingSpinner label="Loading gang sheet" />
            </Card>
          ) : (
            <div className="gang-sheet-builder-canvas-scroll">
              <div
                className="gang-sheet-builder-canvas"
                style={{
                  width: canvasWidthPx * zoom,
                  height: canvasHeightPx * zoom,
                }}
              >
                <div
                  className="gang-sheet-builder-canvas-scaled"
                  style={{ width: canvasWidthPx, height: canvasHeightPx, transform: `scale(${zoom})` }}
                >
                  {builder.items.map((item) => {
                    const thumbnailUrl = thumbnailUrlByAllocationId.get(item.showAllocationId) ?? null;
                    const isSelected = builder.selectedItemId === item.id;

                    const handleDrag: RndDragCallback = (_event, data) => {
                      builder.previewItemPosition(
                        item.id,
                        pixelsToInches(data.x, PIXELS_PER_INCH),
                        pixelsToInches(data.y, PIXELS_PER_INCH),
                      );
                    };

                    const handleDragStop: RndDragCallback = (_event, data) => {
                      void builder.commitItemPosition(
                        item.id,
                        pixelsToInches(data.x, PIXELS_PER_INCH),
                        pixelsToInches(data.y, PIXELS_PER_INCH),
                      );
                    };

                    const handleResize: RndResizeCallback = (_event, _direction, ref, _delta, position) => {
                      builder.previewItemSize(
                        item.id,
                        pixelsToInches(ref.offsetWidth, PIXELS_PER_INCH),
                        pixelsToInches(ref.offsetHeight, PIXELS_PER_INCH),
                        pixelsToInches(position.x, PIXELS_PER_INCH),
                        pixelsToInches(position.y, PIXELS_PER_INCH),
                      );
                    };

                    const handleResizeStop: RndResizeCallback = (_event, _direction, ref, _delta, position) => {
                      void builder.commitItemSize(
                        item.id,
                        pixelsToInches(ref.offsetWidth, PIXELS_PER_INCH),
                        pixelsToInches(ref.offsetHeight, PIXELS_PER_INCH),
                        pixelsToInches(position.x, PIXELS_PER_INCH),
                        pixelsToInches(position.y, PIXELS_PER_INCH),
                      );
                    };

                    return (
                      <Rnd
                        bounds="parent"
                        className={`gang-sheet-builder-item${isSelected ? " is-selected" : ""}`}
                        key={item.id}
                        lockAspectRatio
                        onDrag={handleDrag}
                        onDragStop={handleDragStop}
                        onMouseDown={() => builder.selectItem(item.id)}
                        onResize={handleResize}
                        onResizeStop={handleResizeStop}
                        position={{ x: inchesToPixels(item.xInches, PIXELS_PER_INCH), y: inchesToPixels(item.yInches, PIXELS_PER_INCH) }}
                        scale={zoom}
                        size={{
                          width: inchesToPixels(item.widthInches, PIXELS_PER_INCH),
                          height: inchesToPixels(item.heightInches, PIXELS_PER_INCH),
                        }}
                      >
                        {thumbnailUrl ? (
                          <img
                            alt={item.designTitleSnapshot ?? "Design"}
                            className="gang-sheet-builder-item-image"
                            draggable={false}
                            style={{
                              transform: [
                                item.rotationDegrees ? `rotate(${item.rotationDegrees}deg)` : "",
                                item.flipHorizontal ? "scaleX(-1)" : "",
                                item.flipVertical ? "scaleY(-1)" : "",
                              ]
                                .filter(Boolean)
                                .join(" "),
                            }}
                            src={thumbnailUrl}
                          />
                        ) : (
                          <span className="gang-sheet-builder-item-label">
                            {item.designTitleSnapshot ?? "Design"} #{item.copyIndex + 1}
                          </span>
                        )}
                      </Rnd>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </section>

        <aside className="gang-sheet-builder-details-panel">
          <p className="eyebrow">Sheet details</p>
          <TextInput
            label="Sheet height (inches)"
            min={1}
            name="sheetHeightInches"
            onBlur={handleSaveSheetHeight}
            onChange={(event) => setSheetHeightInput(event.target.value)}
            type="number"
            value={sheetHeightInput ?? sheetHeightInches.toString()}
          />

          <p className="eyebrow">Selected item</p>
          {!builder.selectedItem ? (
            <p className="print-requests-modal-hint">Select a placed item to edit it.</p>
          ) : (
            <div className="gang-sheet-builder-selected-item-controls">
              <p>{builder.selectedItem.designTitleSnapshot ?? "Design"}</p>
              <p>
                {builder.selectedItem.widthInches.toFixed(2)}&quot; x {builder.selectedItem.heightInches.toFixed(2)}
                &quot;
              </p>
              <div className="gang-sheet-builder-selected-item-actions">
                <Button onClick={() => void builder.rotateSelectedItem(90)} size="sm" variant="secondary">
                  <RotateCw aria-hidden="true" size={14} strokeWidth={2} />
                  Rotate
                </Button>
                <Button onClick={() => void builder.flipSelectedItem("horizontal")} size="sm" variant="secondary">
                  <FlipHorizontal aria-hidden="true" size={14} strokeWidth={2} />
                  Flip H
                </Button>
                <Button onClick={() => void builder.flipSelectedItem("vertical")} size="sm" variant="secondary">
                  <FlipVertical aria-hidden="true" size={14} strokeWidth={2} />
                  Flip V
                </Button>
                <Button onClick={() => void builder.duplicateSelectedItem()} size="sm" variant="secondary">
                  <Copy aria-hidden="true" size={14} strokeWidth={2} />
                  Duplicate
                </Button>
                <Button onClick={() => void builder.deleteSelectedItem()} size="sm" variant="danger">
                  <Trash2 aria-hidden="true" size={14} strokeWidth={2} />
                  Delete
                </Button>
              </div>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
