import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";

import {
  compareAiEnrichmentTraces,
  getAiEnrichmentTraceDisplayName,
  getAiEnrichmentTracePassLabel,
  serializeAiEnrichmentTrace,
  validateAiEnrichmentTrace,
} from "@fresh-prints/shared/utils/aiEnrichmentTrace";
import type { AiEnrichmentTrace } from "@fresh-prints/shared/types/ai/aiEnrichmentTrace.types";
import { Button } from "../../../shared/components/Button";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "../../../shared/components/Modal";
import { useAiEnrichmentTraceList } from "../hooks/useAiEnrichmentTraceList";
import { aiEnrichmentTraceService } from "../services/aiEnrichmentTraceService";
import { AiEnrichmentTraceInspector } from "./AiEnrichmentTraceInspector";

type ClearTarget = "selected" | "all";

function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    // Keep this call in the click handler's synchronous path. Awaiting a
    // network request before calling Clipboard API can consume user activation
    // and make the first click appear to do nothing in Chromium.
    return navigator.clipboard.writeText(text);
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();

  return copied
    ? Promise.resolve()
    : Promise.reject(new Error("Clipboard access is unavailable."));
}

export function AiEnrichmentTraceBrowser() {
  const { traces, error, refresh } = useAiEnrichmentTraceList();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [imported, setImported] = useState<AiEnrichmentTrace | null>(null);
  const [prefetchedTrace, setPrefetchedTrace] = useState<AiEnrichmentTrace | null>(null);
  const [compareId, setCompareId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [clearTarget, setClearTarget] = useState<ClearTarget | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const copyInFlightRef = useRef(false);

  const selected = useMemo(
    () => imported ?? traces.find((trace) => trace.traceId === selectedId) ?? null,
    [imported, selectedId, traces],
  );

  useEffect(() => {
    setPrefetchedTrace(null);
    if (imported || !selectedId) {
      return undefined;
    }

    let isCurrent = true;
    void aiEnrichmentTraceService
      .get(selectedId)
      .then((trace) => {
        if (isCurrent) setPrefetchedTrace(trace);
      })
      .catch(() => {
        // The bounded live trace remains a valid copy fallback when the
        // owner-only full-trace callable is unavailable or still loading.
      });

    return () => {
      isCurrent = false;
    };
  }, [imported, selectedId]);

  useEffect(() => {
    if (!clearTarget) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isClearing) setClearTarget(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [clearTarget, isClearing]);

  const refreshTraces = async () => {
    setIsRefreshing(true);
    setActionError(null);
    try {
      await refresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  const loadFull = (trace: AiEnrichmentTrace) =>
    aiEnrichmentTraceService.get(trace.traceId);

  const copy = async (trace: AiEnrichmentTrace) => {
    if (copyInFlightRef.current) return;
    copyInFlightRef.current = true;
    setIsCopying(true);
    // Give immediate feedback while the clipboard promise finishes. A slow
    // clipboard implementation should never make the owner click twice.
    setCopied(true);
    setActionError(null);

    const source = prefetchedTrace?.traceId === trace.traceId ? prefetchedTrace : trace;
    const text = JSON.stringify(
      serializeAiEnrichmentTrace(source, source.captureFullTrace),
      null,
      2,
    );

    try {
      // No await occurs before copyText, so the first click owns the clipboard
      // gesture. The full trace is prefetched when a persisted trace is selected.
      await copyText(text);
      window.setTimeout(() => setCopied(false), 1600);
    } catch (value) {
      setCopied(false);
      setActionError(value instanceof Error ? value.message : "Unable to copy trace.");
    } finally {
      copyInFlightRef.current = false;
      setIsCopying(false);
    }
  };

  const download = async (trace: AiEnrichmentTrace) => {
    setActionError(null);
    try {
      const full = await loadFull(trace);
      const blob = new Blob(
        [JSON.stringify(serializeAiEnrichmentTrace(full, full.captureFullTrace), null, 2)],
        { type: "application/json" },
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${trace.traceId}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (value) {
      setActionError(value instanceof Error ? value.message : "Unable to export trace.");
    }
  };

  const requestClearSelected = () => {
    if (selected) setClearTarget("selected");
  };

  const requestClearAll = () => {
    if (traces.length) setClearTarget("all");
  };

  const confirmClear = async () => {
    if (!clearTarget) return;

    const ids = clearTarget === "all"
      ? traces.map((trace) => trace.traceId)
      : selected
        ? [selected.traceId]
        : [];
    if (!ids.length) {
      setClearTarget(null);
      return;
    }

    const selectedIndex = selected
      ? traces.findIndex((trace) => trace.traceId === selected.traceId)
      : -1;
    const nextSelectedId = selectedIndex >= 0
      ? (traces[selectedIndex + 1]?.traceId ?? traces[selectedIndex - 1]?.traceId ?? null)
      : null;

    setIsClearing(true);
    setActionError(null);
    try {
      await aiEnrichmentTraceService.clear(ids);
      const refreshedTraces = await refresh();
      const remainingTraces = refreshedTraces ?? traces.filter((trace) => !ids.includes(trace.traceId));
      const nextIdAfterDelete = clearTarget === "all"
        ? null
        : selectedIndex >= 0
          ? (remainingTraces[selectedIndex]?.traceId ?? remainingTraces[selectedIndex - 1]?.traceId ?? null)
          : null;
      setImported(null);
      setCompareId(null);
      setClearTarget(null);
      setSelectedId(nextIdAfterDelete ?? nextSelectedId);
    } catch (value) {
      setActionError(value instanceof Error ? value.message : "Unable to clear trace(s).");
    } finally {
      setIsClearing(false);
    }
  };

  const comparison = selected && compareId
    ? compareAiEnrichmentTraces(
        selected,
        traces.find((trace) => trace.traceId === compareId) ?? selected,
      )
    : null;

  const importTrace = (file: File) => {
    void file
      .text()
      .then((text) => {
        const value: unknown = JSON.parse(text);
        if (!validateAiEnrichmentTrace(value)) throw new Error("Invalid AI trace.");
        setActionError(null);
        setPrefetchedTrace(null);
        setImported(value);
        setSelectedId(value.traceId);
      })
      .catch((value) => {
        setActionError(value instanceof Error ? value.message : "Unable to import trace.");
      });
  };

  const displayedError = error ?? actionError;

  return (
    <section aria-label="AI Enrichment Trace Browser" className="ai-trace-browser">
      <header className="card settings-section ai-trace-browser-header">
        <div className="settings-section-header">
          <p className="ai-trace-eyebrow">Owner / admin diagnostics</p>
          <h2 className="settings-section-title">AI Enrichment Inspector</h2>
          <p className="settings-section-description">
            Watch Processing, Playground, and explicitly trace-enabled development tests as they move through the enrichment pipeline.
          </p>
        </div>
        <div className="ai-trace-toolbar">
          <button
            className={`button button-secondary ai-trace-refresh-button${isRefreshing ? " is-refreshing" : ""}`}
            disabled={isRefreshing}
            onClick={() => void refreshTraces()}
            type="button"
          >
            <span aria-hidden="true">↻</span>{isRefreshing ? "Refreshing…" : "Refresh"}
          </button>
          <label className="ai-trace-file-button">
            Import test trace
            <input
              accept="application/json,.json"
              aria-label="Import test trace"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) importTrace(file);
                event.currentTarget.value = "";
              }}
              type="file"
            />
          </label>
          <Button disabled={!traces.length || isClearing} onClick={requestClearAll} variant="danger">
            Clear all
          </Button>
        </div>
        {displayedError ? <p className="settings-section-status" role="alert">{displayedError}</p> : null}
      </header>

      <div className="ai-trace-layout">
        <aside className="card ai-trace-list">
          <div className="ai-trace-list-header">
            <h3>Active &amp; recent</h3>
            <span>{traces.length}</span>
          </div>
          {traces.length ? (
            <ul>
              {traces.map((trace) => (
                <li key={trace.traceId}>
                  <button
                    className={`ai-trace-list-item${selected?.traceId === trace.traceId ? " is-selected" : ""}`}
                    onClick={() => {
                      setImported(null);
                      setSelectedId(trace.traceId);
                      setCompareId(null);
                      setCopied(false);
                      setActionError(null);
                    }}
                    type="button"
                  >
                    <span className="ai-trace-list-meta">
                      <span className="ai-trace-list-source">{trace.source}</span>
                      <span className="ai-trace-list-pass">{getAiEnrichmentTracePassLabel(trace)}</span>
                    </span>
                    <strong>{getAiEnrichmentTraceDisplayName(trace)}</strong>
                    <span>{trace.lifecycleState}{trace.testResult ? ` · ${trace.testResult}` : ""}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="settings-section-status">No traces yet.</p>
          )}
        </aside>

        <main className="ai-trace-detail">
          {selected ? (
            <>
              <div className="ai-trace-actions">
                <button
                  className={`button button-secondary ai-trace-copy-button${copied ? " is-copied" : ""}`}
                  disabled={isCopying}
                  onClick={() => void copy(selected)}
                  type="button"
                >
                  <span aria-hidden="true">{copied ? "✓" : "⧉"}</span>{copied ? "Copied" : "Copy Full Trace"}
                </button>
                <button className="button button-secondary" onClick={() => void download(selected)} type="button">
                  Export
                </button>
                <button className="button button-danger" disabled={isClearing} onClick={requestClearSelected} type="button">
                  {isClearing ? "Clearing…" : "Clear"}
                </button>
                <select
                  aria-label="Compare with trace"
                  className="ai-trace-compare-select"
                  onChange={(event) => setCompareId(event.target.value || null)}
                  value={compareId ?? ""}
                >
                  <option value="">Compare traces…</option>
                  {traces
                    .filter((trace) => trace.traceId !== selected.traceId)
                    .map((trace) => (
                      <option key={trace.traceId} value={trace.traceId}>
                        {trace.source} · {trace.traceId}
                      </option>
                    ))}
                </select>
              </div>
              {comparison ? <pre className="card settings-code-block ai-trace-comparison">{JSON.stringify(comparison, null, 2)}</pre> : null}
              <AiEnrichmentTraceInspector traceId={selected.traceId} />
            </>
          ) : (
            <div className="card ai-trace-empty">
              <h3>Select a trace</h3>
              <p className="settings-section-description">
                Choose an active or recent trace to inspect its recorded pipeline state.
              </p>
            </div>
          )}
        </main>
      </div>

      {clearTarget ? (
        <div
          className="modal-overlay modal-overlay-blur"
          onClick={() => {
            if (!isClearing) setClearTarget(null);
          }}
        >
          <div className="ai-trace-confirm-modal-shell" onClick={(event) => event.stopPropagation()} role="presentation">
            <Modal
              aria-labelledby="ai-trace-clear-confirm-title"
              aria-modal="true"
              className="ai-trace-confirm-modal"
              role="alertdialog"
            >
              <ModalHeader>
                <div>
                  <p className="eyebrow">Inspector cleanup</p>
                  <h2 id="ai-trace-clear-confirm-title">
                    {clearTarget === "all" ? "Clear all traces?" : "Clear this trace?"}
                  </h2>
                </div>
                <button
                  aria-label="Close confirmation"
                  className="icon-button icon-button-md icon-button-ghost"
                  disabled={isClearing}
                  onClick={() => setClearTarget(null)}
                  type="button"
                >
                  <X aria-hidden="true" size={18} strokeWidth={2.2} />
                </button>
              </ModalHeader>
              <ModalBody>
                <p className="ai-trace-confirm-modal-copy">
                  {clearTarget === "all"
                    ? `This permanently deletes the ${traces.length} trace record${traces.length === 1 ? "" : "s"} and any stored full-trace diagnostic data from DEV.`
                    : "This permanently deletes the complete trace record and any stored full-trace diagnostic data from DEV."}
                </p>
              </ModalBody>
              <ModalFooter>
                <Button disabled={isClearing} onClick={() => setClearTarget(null)} variant="secondary">
                  Cancel
                </Button>
                <Button disabled={isClearing} onClick={() => void confirmClear()} variant="danger">
                  {isClearing ? "Clearing…" : clearTarget === "all" ? "Clear all" : "Clear"}
                </Button>
              </ModalFooter>
            </Modal>
          </div>
        </div>
      ) : null}
    </section>
  );
}
