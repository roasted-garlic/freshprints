import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

import { Button } from "./Button";
import { viewportDebugService } from "../services/viewportDebugService";
import type { WindowMetricsResult } from "@fresh-prints/shared/types/app/appIpc.types";

interface ViewportDebugOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PanelPosition {
  left: number;
  top: number;
}

const PANEL_MARGIN_PX = 16;

function formatSize(width: number, height: number): string {
  return `${width} × ${height}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function getBottomRightPosition(panel: HTMLElement): PanelPosition {
  const left = window.innerWidth - panel.offsetWidth - PANEL_MARGIN_PX;
  const top = window.innerHeight - panel.offsetHeight - PANEL_MARGIN_PX;

  return {
    left: Math.max(PANEL_MARGIN_PX, left),
    top: Math.max(PANEL_MARGIN_PX, top),
  };
}

function clampPanelPosition(position: PanelPosition, panel: HTMLElement): PanelPosition {
  const maxLeft = Math.max(PANEL_MARGIN_PX, window.innerWidth - panel.offsetWidth - PANEL_MARGIN_PX);
  const maxTop = Math.max(PANEL_MARGIN_PX, window.innerHeight - panel.offsetHeight - PANEL_MARGIN_PX);

  return {
    left: clamp(position.left, PANEL_MARGIN_PX, maxLeft),
    top: clamp(position.top, PANEL_MARGIN_PX, maxTop),
  };
}

export function ViewportDebugOverlay({ isOpen, onClose }: ViewportDebugOverlayProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const dragOffsetRef = useRef<{ x: number; y: number } | null>(null);
  const [metrics, setMetrics] = useState<WindowMetricsResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isApplyingMinimum, setIsApplyingMinimum] = useState(false);
  const [isResettingMinimum, setIsResettingMinimum] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState<PanelPosition | null>(null);

  const placePanelBottomRight = useCallback(() => {
    const panel = panelRef.current;
    if (!panel) {
      return;
    }

    setPosition(getBottomRightPosition(panel));
  }, []);

  const refreshMetrics = useCallback(async () => {
    if (!viewportDebugService.isAvailable()) {
      return;
    }

    try {
      const nextMetrics = await viewportDebugService.getWindowMetrics();
      setMetrics(nextMetrics);
      setError(null);
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Unable to read window metrics.");
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    void refreshMetrics();

    const intervalId = window.setInterval(() => {
      void refreshMetrics();
    }, 400);

    const handleResize = () => {
      void refreshMetrics();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("resize", handleResize);
    };
  }, [isOpen, refreshMetrics]);

  useLayoutEffect(() => {
    if (!isOpen) {
      return;
    }

    placePanelBottomRight();
  }, [isOpen, placePanelBottomRight]);

  useEffect(() => {
    if (!isOpen) {
      setPosition(null);
      dragOffsetRef.current = null;
      setIsDragging(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !position) {
      return;
    }

    const handleResize = () => {
      const panel = panelRef.current;
      if (!panel) {
        return;
      }

      setPosition((current) => (current ? clampPanelPosition(current, panel) : current));
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isOpen, position]);

  useEffect(() => {
    if (!isOpen) {
      setStatusMessage(null);
    }
  }, [isOpen]);

  const handleDragPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (!position || event.button !== 0) {
      return;
    }

    event.preventDefault();
    dragOffsetRef.current = {
      x: event.clientX - position.left,
      y: event.clientY - position.top,
    };
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleDragPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (!dragOffsetRef.current) {
      return;
    }

    const panel = panelRef.current;
    if (!panel) {
      return;
    }

    setPosition(
      clampPanelPosition(
        {
          left: event.clientX - dragOffsetRef.current.x,
          top: event.clientY - dragOffsetRef.current.y,
        },
        panel,
      ),
    );
  };

  const endDrag = (event: ReactPointerEvent<HTMLElement>) => {
    if (!dragOffsetRef.current) {
      return;
    }

    dragOffsetRef.current = null;
    setIsDragging(false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  if (!isOpen || !viewportDebugService.isAvailable()) {
    return null;
  }

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const minimumWidth = metrics?.windowWidth ?? viewportWidth;
  const minimumHeight = metrics?.windowHeight ?? viewportHeight;
  const copyLine = `STUDIO_MIN_WINDOW_WIDTH = ${minimumWidth}; STUDIO_MIN_WINDOW_HEIGHT = ${minimumHeight};`;

  async function handleCopySnapshot() {
    const snapshot = [
      `Viewport: ${formatSize(viewportWidth, viewportHeight)}`,
      metrics ? `Window: ${formatSize(metrics.windowWidth, metrics.windowHeight)}` : null,
      metrics ? `Content: ${formatSize(metrics.contentWidth, metrics.contentHeight)}` : null,
      metrics ? `Minimum: ${formatSize(metrics.minWidth, metrics.minHeight)}` : null,
      metrics ? `Maximized: ${metrics.isMaximized ? "yes" : "no"}` : null,
      `Suggested constants: ${copyLine}`,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      await navigator.clipboard.writeText(snapshot);
      setStatusMessage("Copied viewport snapshot to clipboard.");
    } catch {
      setStatusMessage("Unable to copy snapshot.");
    }
  }

  async function handleApplyViewportMinimum() {
    if (!import.meta.env.DEV) {
      return;
    }

    setIsApplyingMinimum(true);
    setStatusMessage(null);

    try {
      const nextMinimum = await viewportDebugService.setMinimumWindowSize(minimumWidth, minimumHeight);
      setStatusMessage(
        `Minimum size set to ${formatSize(nextMinimum.minWidth, nextMinimum.minHeight)} for this session.`,
      );
      await refreshMetrics();
    } catch (applyError) {
      setStatusMessage(applyError instanceof Error ? applyError.message : "Unable to update minimum size.");
    } finally {
      setIsApplyingMinimum(false);
    }
  }

  async function handleUnlockMinimum() {
    if (!import.meta.env.DEV) {
      return;
    }

    setIsResettingMinimum(true);
    setStatusMessage(null);

    try {
      const nextMinimum = await viewportDebugService.resetMinimumWindowSize("unlock");
      setStatusMessage(
        `Minimum unlocked to ${formatSize(nextMinimum.minWidth, nextMinimum.minHeight)}. You can resize freely again.`,
      );
      await refreshMetrics();
    } catch (resetError) {
      setStatusMessage(resetError instanceof Error ? resetError.message : "Unable to reset minimum size.");
    } finally {
      setIsResettingMinimum(false);
    }
  }

  async function handleResetMinimumToDefault() {
    if (!import.meta.env.DEV) {
      return;
    }

    setIsResettingMinimum(true);
    setStatusMessage(null);

    try {
      const nextMinimum = await viewportDebugService.resetMinimumWindowSize("default");
      setStatusMessage(
        `Minimum reset to default ${formatSize(nextMinimum.minWidth, nextMinimum.minHeight)}.`,
      );
      await refreshMetrics();
    } catch (resetError) {
      setStatusMessage(resetError instanceof Error ? resetError.message : "Unable to reset minimum size.");
    } finally {
      setIsResettingMinimum(false);
    }
  }

  return (
    <div className="viewport-debug-overlay" role="dialog" aria-label="Viewport debug">
      <div
        className="viewport-debug-panel"
        ref={panelRef}
        style={
          position
            ? {
                left: `${position.left}px`,
                top: `${position.top}px`,
              }
            : undefined
        }
      >
        <header
          className={`viewport-debug-header${isDragging ? " is-dragging" : ""}`}
          onPointerCancel={endDrag}
          onPointerDown={handleDragPointerDown}
          onPointerMove={handleDragPointerMove}
          onPointerUp={endDrag}
        >
          <div>
            <p className="eyebrow">Debug</p>
            <h2>Viewport size</h2>
          </div>
          <button
            aria-label="Close viewport debug"
            className="viewport-debug-close"
            onClick={onClose}
            onPointerDown={(event) => event.stopPropagation()}
            type="button"
          >
            ×
          </button>
        </header>

        <dl className="viewport-debug-metrics">
          <div>
            <dt>Viewport (CSS)</dt>
            <dd>{formatSize(viewportWidth, viewportHeight)}</dd>
          </div>
          <div>
            <dt>Window outer</dt>
            <dd>{metrics ? formatSize(metrics.windowWidth, metrics.windowHeight) : "—"}</dd>
          </div>
          <div>
            <dt>Content area</dt>
            <dd>{metrics ? formatSize(metrics.contentWidth, metrics.contentHeight) : "—"}</dd>
          </div>
          <div>
            <dt>Configured minimum</dt>
            <dd>{metrics ? formatSize(metrics.minWidth, metrics.minHeight) : "—"}</dd>
          </div>
          <div>
            <dt>Maximized</dt>
            <dd>{metrics ? (metrics.isMaximized ? "Yes" : "No") : "—"}</dd>
          </div>
        </dl>

        <p className="viewport-debug-hint">
          Resize the window, then copy the window size you want as the minimum. Suggested constants use outer window
          dimensions (not viewport). The app can still be minimized or maximized; when restored, it cannot shrink below
          the configured minimum.
        </p>

        <pre className="viewport-debug-constants">{copyLine}</pre>

        {error ? <p className="viewport-debug-error">{error}</p> : null}
        {statusMessage ? <p className="viewport-debug-status">{statusMessage}</p> : null}

        <div className="viewport-debug-actions">
          <Button onClick={() => void handleCopySnapshot()} size="sm" variant="secondary">
            Copy snapshot
          </Button>
          {import.meta.env.DEV ? (
            <>
              <Button
                disabled={isApplyingMinimum || isResettingMinimum}
                onClick={() => void handleApplyViewportMinimum()}
                size="sm"
                variant="primary"
              >
                {isApplyingMinimum ? "Applying…" : "Use window size as minimum (dev)"}
              </Button>
              <Button
                disabled={isApplyingMinimum || isResettingMinimum}
                onClick={() => void handleUnlockMinimum()}
                size="sm"
                variant="secondary"
              >
                {isResettingMinimum ? "Resetting…" : "Unlock minimum (dev)"}
              </Button>
              <Button
                disabled={isApplyingMinimum || isResettingMinimum}
                onClick={() => void handleResetMinimumToDefault()}
                size="sm"
                variant="ghost"
              >
                Reset to default minimum
              </Button>
            </>
          ) : null}
        </div>

        <p className="viewport-debug-shortcut">Toggle with Ctrl + Shift + V</p>
      </div>
    </div>
  );
}
