import { useAiEnrichmentTrace } from "../hooks/useAiEnrichmentTrace";
import { projectAiEnrichmentTrace } from "@fresh-prints/shared/utils/aiEnrichmentTrace";

function renderValue(value: unknown, unavailable = "NOT CAPTURED"): string {
  if (value === undefined || value === null || value === "") return unavailable;
  return typeof value === "string" ? value : JSON.stringify(value, null, 2);
}

export function AiEnrichmentTraceInspector({ traceId }: { traceId: string | null }) {
  const { trace, error } = useAiEnrichmentTrace(traceId);
  if (!traceId) return <div className="ai-trace-empty">Select an AI trace to inspect.</div>;
  if (error) return <div className="settings-section-status" role="alert">Unable to load AI trace: {error}</div>;
  if (!trace) return <div className="settings-section-status">Loading AI trace…</div>;
  const projection = projectAiEnrichmentTrace(trace);
  return <section aria-label="AI Enrichment Inspector" className="card settings-section ai-trace-inspector">
    <header className="settings-section-header"><div className="ai-trace-inspector-heading"><div><p className="ai-trace-eyebrow">Live diagnostic trace</p><h2 className="settings-section-title">AI Enrichment Inspector</h2></div><span className="ai-trace-status">{trace.lifecycleState}{trace.testResult ? ` · ${trace.testResult}` : ""}</span></div><p className="settings-section-description"><strong>{trace.source}</strong> · {trace.testName ?? trace.designId ?? trace.traceId}</p></header>
    <div className="ai-trace-summary-grid"><div><span>Trace ID</span><strong>{trace.traceId}</strong></div><div><span>Provider / model</span><strong>{trace.provider ?? "—"} / {trace.model ?? "—"}</strong></div><div><span>Started</span><strong>{new Date(trace.startedAt).toLocaleString()}</strong></div><div><span>Capture</span><strong>{trace.captureFullTrace ? "Full (owner)" : "Bounded"}</strong></div></div>
    <div className="ai-trace-sections"><details open><summary>Stages</summary><ol className="ai-trace-stage-list">{trace.stages.map((stage) => <li key={`${stage.stage}-${stage.at}`}><span className="ai-trace-stage-dot" /> <strong>{stage.stage}</strong><time>{new Date(stage.at).toLocaleTimeString()}</time></li>)}</ol></details>
    <details><summary>Effective prompt</summary><pre className="settings-code-block">{renderValue(projection.effectivePrompt, "NOT CAPTURED")}</pre></details>
    <details><summary>Response contract / request</summary><pre className="settings-code-block">{renderValue(projection.responseContract)}</pre></details>
    <details><summary>Provider response</summary><pre className="settings-code-block">{renderValue(projection.providerResponse)}</pre></details>
    <details><summary>Provider error</summary><pre className="settings-code-block">{renderValue(projection.providerError)}</pre></details>
    <details><summary>Normalized result and decisions</summary><pre className="settings-code-block">{renderValue({ normalized: projection.normalized, decisions: projection.decisions })}</pre></details>
    <details><summary>Expected / actual / result</summary><pre className="settings-code-block">{renderValue({ expected: projection.expected, actual: projection.actual, testResult: projection.testResult })}</pre></details>
    <details><summary>VCP / candidate / persistence</summary><pre className="settings-code-block">{renderValue({ vcp: projection.vcp ?? projection.vcpState, candidate: projection.candidate ?? projection.candidateState, persistence: projection.persistence ?? projection.persistenceState })}</pre></details></div>
  </section>;
}
