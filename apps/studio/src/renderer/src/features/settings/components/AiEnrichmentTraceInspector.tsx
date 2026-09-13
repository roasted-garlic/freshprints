import { useAiEnrichmentTrace } from "../hooks/useAiEnrichmentTrace";
import {
  getAiEnrichmentTraceDisplayName,
  getAiEnrichmentTracePassLabel,
  projectAiEnrichmentTrace,
} from "@fresh-prints/shared/utils/aiEnrichmentTrace";

function renderValue(value: unknown, unavailable = "NOT CAPTURED"): string {
  if (value === undefined || value === null || value === "") return unavailable;
  return typeof value === "string" ? value : JSON.stringify(value, null, 2);
}

const NOT_REACHED = "NOT REACHED";

function DiagnosticSection({
  title,
  value,
  open = false,
}: {
  title: string;
  value: unknown;
  open?: boolean;
}) {
  return (
    <details open={open}>
      <summary>{title}</summary>
      <pre className="settings-code-block ai-trace-json-panel">
        {renderValue(value)}
      </pre>
    </details>
  );
}

export function AiEnrichmentTraceInspector({ traceId }: { traceId: string | null }) {
  const { trace, error } = useAiEnrichmentTrace(traceId);

  if (!traceId) return <div className="ai-trace-empty">Select an AI trace to inspect.</div>;
  if (error) {
    return (
      <div className="settings-section-status" role="alert">
        Unable to load AI trace: {error}
      </div>
    );
  }
  if (!trace) return <div className="settings-section-status">Loading AI trace…</div>;

  const projection = projectAiEnrichmentTrace(trace);
  const diagnostics = projection.pass2Diagnostics;
  const semanticReviewInput = diagnostics?.semanticReviewInput ?? {
    input: trace.input,
    smartProfile: trace.smartProfile,
    vcp: trace.vcp,
  };
  const renderedPrompt = diagnostics?.renderedPrompt ?? {
    effectiveUser: projection.effectivePrompt,
  };
  const providerRequest = diagnostics?.providerRequest ?? {
    requestMetadata: trace.requestMetadata,
    responseContract: projection.responseContract,
  };
  const patchValidationInput = diagnostics?.patchValidationInput ?? {
    status: "NOT CAPTURED",
    currentSmartProfile: trace.smartProfile?.aiProduced,
  };
  const deterministicResult = {
    normalized: projection.normalized,
    decisions: projection.decisions,
    downstreamStages: {
      parser: projection.parserState ?? NOT_REACHED,
      vcp: projection.vcpState ?? NOT_REACHED,
      candidate: projection.candidateState ?? NOT_REACHED,
      persistence: projection.persistenceState ?? NOT_REACHED,
    },
  };

  return (
    <section aria-label="AI Enrichment Inspector" className="card settings-section ai-trace-inspector">
      <header className="settings-section-header">
        <div className="ai-trace-inspector-heading">
          <div>
            <p className="ai-trace-eyebrow">Live diagnostic trace</p>
            <h2 className="settings-section-title">AI Enrichment Inspector</h2>
          </div>
          <div className="ai-trace-inspector-badges">
            <span className="ai-trace-pass-badge">{getAiEnrichmentTracePassLabel(trace)}</span>
            <span className="ai-trace-status">
              {trace.lifecycleState}{trace.testResult ? ` · ${trace.testResult}` : ""}
            </span>
          </div>
        </div>
        <p className="settings-section-description">
          <strong>{trace.source}</strong> · {getAiEnrichmentTraceDisplayName(trace)}
        </p>
      </header>

      <div className="ai-trace-summary-grid">
        <div><span>Trace ID</span><strong>{trace.traceId}</strong></div>
        <div><span>Provider / model</span><strong>{trace.provider ?? "—"} / {trace.model ?? "—"}</strong></div>
        <div><span>Started</span><strong>{new Date(trace.startedAt).toLocaleString()}</strong></div>
        <div><span>Capture</span><strong>{trace.captureFullTrace ? "Full (owner)" : "Bounded"}</strong></div>
      </div>

      <div className="ai-trace-sections">
        <details open>
          <summary>Stages</summary>
          <ol className="ai-trace-stage-list">
            {trace.stages.map((stage) => (
              <li key={`${stage.stage}-${stage.at}`}>
                <span className="ai-trace-stage-dot" />
                <strong>{stage.stage}</strong>
                <time>{new Date(stage.at).toLocaleTimeString()}</time>
              </li>
            ))}
          </ol>
        </details>

        <DiagnosticSection title="Semantic Review Input" value={semanticReviewInput} />
        <DiagnosticSection title="Rendered Prompt / Messages" value={renderedPrompt} />
        <DiagnosticSection title="Provider Request / Response Contract" value={providerRequest} />
        <DiagnosticSection
          title="Provider Response"
          value={{ providerResponse: projection.providerResponse, providerError: projection.providerError }}
        />
        <DiagnosticSection title="Patch Validation" value={patchValidationInput} />
        <DiagnosticSection title="Deterministic Result / Decision" value={deterministicResult} />
        <DiagnosticSection
          title="Expected / Actual / Result"
          value={{ expected: projection.expected, actual: projection.actual, testResult: projection.testResult }}
        />
        <DiagnosticSection title="Pass 2 Input / Output" value={trace.pass2} />
      </div>
    </section>
  );
}
