import { useMemo, useState } from "react";
import { compareAiEnrichmentTraces, serializeAiEnrichmentTrace, validateAiEnrichmentTrace } from "@fresh-prints/shared/utils/aiEnrichmentTrace";
import type { AiEnrichmentTrace } from "@fresh-prints/shared/types/ai/aiEnrichmentTrace.types";
import { useAiEnrichmentTraceList } from "../hooks/useAiEnrichmentTraceList";
import { aiEnrichmentTraceService } from "../services/aiEnrichmentTraceService";
import { AiEnrichmentTraceInspector } from "./AiEnrichmentTraceInspector";

export function AiEnrichmentTraceBrowser() {
  const { traces, error, refresh } = useAiEnrichmentTraceList();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [imported, setImported] = useState<AiEnrichmentTrace | null>(null);
  const [compareId, setCompareId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const selected = useMemo(() => imported ?? traces.find((trace) => trace.traceId === selectedId) ?? null, [imported, selectedId, traces]);
  const refreshTraces = async () => { setIsRefreshing(true); try { await refresh(); } finally { setIsRefreshing(false); } };
  const loadFull = (trace: AiEnrichmentTrace) => aiEnrichmentTraceService.get(trace.traceId);
  const copy = async (trace: AiEnrichmentTrace) => { const full = await loadFull(trace); await navigator.clipboard.writeText(JSON.stringify(serializeAiEnrichmentTrace(full, full.captureFullTrace), null, 2)); setCopied(true); window.setTimeout(() => setCopied(false), 1600); };
  const download = async (trace: AiEnrichmentTrace) => { const full = await loadFull(trace); const blob = new Blob([JSON.stringify(serializeAiEnrichmentTrace(full, full.captureFullTrace), null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `${trace.traceId}.json`; link.click(); URL.revokeObjectURL(url); };
  const clearSelected = async () => { if (!selected || !window.confirm("Delete this complete AI trace record from DEV?")) return; setIsClearing(true); try { await aiEnrichmentTraceService.clear([selected.traceId]); setImported(null); setSelectedId(null); await refresh(); } finally { setIsClearing(false); } };
  const comparison = selected && compareId ? compareAiEnrichmentTraces(selected, traces.find((trace) => trace.traceId === compareId) ?? selected) : null;
  const importTrace = (file: File) => { void file.text().then((text) => { const value: unknown = JSON.parse(text); if (!validateAiEnrichmentTrace(value)) throw new Error("Invalid AI trace."); setImported(value); setSelectedId(value.traceId); }); };
  return <section aria-label="AI Enrichment Trace Browser" className="ai-trace-browser">
    <header className="card settings-section ai-trace-browser-header">
      <div className="settings-section-header"><p className="ai-trace-eyebrow">Owner / admin diagnostics</p><h2 className="settings-section-title">AI Enrichment Inspector</h2><p className="settings-section-description">Watch Processing, Playground, and explicitly trace-enabled development tests as they move through the enrichment pipeline.</p></div>
      <div className="ai-trace-toolbar"><button className={`button button-secondary ai-trace-refresh-button${isRefreshing ? " is-refreshing" : ""}`} type="button" onClick={() => void refreshTraces()} disabled={isRefreshing}><span aria-hidden="true">↻</span>{isRefreshing ? "Refreshing…" : "Refresh"}</button><label className="ai-trace-file-button">Import test trace<input type="file" accept="application/json,.json" aria-label="Import test trace" onChange={(event) => { const file = event.target.files?.[0]; if (file) importTrace(file); }} /></label></div>
      {error ? <p className="settings-section-status" role="alert">{error}</p> : null}
    </header>
    <div className="ai-trace-layout"><aside className="card ai-trace-list"><div className="ai-trace-list-header"><h3>Active & recent</h3><span>{traces.length}</span></div>{traces.length ? <ul>{traces.map((trace) => <li key={trace.traceId}><button className={`ai-trace-list-item${selected?.traceId === trace.traceId ? " is-selected" : ""}`} type="button" onClick={() => { setImported(null); setSelectedId(trace.traceId); }}><span className="ai-trace-list-source">{trace.source}</span><strong>{trace.testName ?? trace.designId ?? "Unattributed run"}</strong><span>{trace.lifecycleState}{trace.testResult ? ` · ${trace.testResult}` : ""}</span></button></li>)}</ul> : <p className="settings-section-status">No traces yet.</p>}</aside>
      <main className="ai-trace-detail">{selected ? <><div className="ai-trace-actions"><button className={`button button-secondary ai-trace-copy-button${copied ? " is-copied" : ""}`} type="button" onClick={() => void copy(selected)}><span aria-hidden="true">{copied ? "✓" : "⧉"}</span>{copied ? "Copied" : "Copy Full Trace"}</button><button className="button button-secondary" type="button" onClick={() => void download(selected)}>Export</button><button className="button button-danger" type="button" onClick={() => void clearSelected()} disabled={isClearing}>{isClearing ? "Clearing…" : "Clear"}</button><select className="ai-trace-compare-select" aria-label="Compare with trace" value={compareId ?? ""} onChange={(event) => setCompareId(event.target.value || null)}><option value="">Compare traces…</option>{traces.filter((trace) => trace.traceId !== selected.traceId).map((trace) => <option key={trace.traceId} value={trace.traceId}>{trace.source} · {trace.traceId}</option>)}</select></div>{comparison ? <pre className="card settings-code-block ai-trace-comparison">{JSON.stringify(comparison, null, 2)}</pre> : null}<AiEnrichmentTraceInspector traceId={selected.traceId} /></> : <div className="card ai-trace-empty"><h3>Select a trace</h3><p className="settings-section-description">Choose an active or recent trace to inspect its recorded pipeline state.</p></div>}</main>
    </div>
  </section>;
}
