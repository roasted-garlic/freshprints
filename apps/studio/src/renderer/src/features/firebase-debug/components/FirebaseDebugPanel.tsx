import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useLocation } from "react-router-dom";

import {
  buildFirebaseDebugReport,
  type FirebaseDebugReport,
} from "@fresh-prints/shared/utils/firebaseDebugReport";
import {
  formatElapsedMs,
  formatEventAction,
  formatEventRoute,
  formatEventSubject,
  selectRecentEvents,
} from "@fresh-prints/shared/utils/firebaseDebugEventFormatting";
import {
  getFirestoreUsageTraceSnapshot,
  isFirestoreUsageTraceEnabled,
  resetFirestoreUsageTraceForTests,
  type FirestoreTraceSnapshot,
} from "@fresh-prints/shared/utils/firestoreUsageTrace";
import {
  getAiQueueTraceSnapshot,
  resetAiQueueTrace,
} from "../../../config/aiQueueTraceClient";

import { firebaseConfig } from "../../../config/env";

const POLL_INTERVAL_MS = 1000;
const TRACE_STORAGE_FLAG = "FP_FIRESTORE_TRACE";
const TOTAL_LABELS: Record<string, string> = {
  readOperations: "Read operations",
  documentsReturned: "Documents returned",
  approximateBillableDocumentReads: "Approx. billable document reads",
  listenerInitialDocuments: "Listener initial documents",
  listenerUpdateDocuments: "Listener update documents",
};

const styles: Record<string, CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 9999,
    background: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    justifyContent: "flex-end",
    pointerEvents: "auto",
  },
  panel: {
    boxSizing: "border-box",
    width: "100vw",
    maxWidth: "485px",
    height: "100vh",
    overflowY: "auto",
    overflowX: "hidden",
    background: "#161b22",
    color: "#e6edf3",
    padding: "16px",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
    fontSize: "12px",
    boxShadow: "-4px 0 16px rgba(0,0,0,0.4)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "12px",
    gap: "8px",
  },
  title: {
    fontSize: "14px",
    fontWeight: 700,
    margin: 0,
  },
  subtitle: {
    color: "#8b949e",
    margin: "4px 0 0",
  },
  disclaimer: {
    color: "#d29922",
    background: "rgba(210, 153, 34, 0.1)",
    border: "1px solid rgba(210, 153, 34, 0.4)",
    borderRadius: "6px",
    padding: "8px",
    margin: "0 0 12px",
  },
  controls: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    marginBottom: "12px",
  },
  button: {
    background: "#21262d",
    color: "#e6edf3",
    border: "1px solid #30363d",
    borderRadius: "6px",
    padding: "4px 10px",
    cursor: "pointer",
    fontSize: "12px",
  },
  cardsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
    gap: "8px",
    marginBottom: "16px",
  },
  card: {
    background: "#0d1117",
    border: "1px solid #30363d",
    borderRadius: "6px",
    padding: "8px",
  },
  cardLabel: {
    color: "#8b949e",
    fontSize: "10px",
    textTransform: "uppercase",
  },
  cardValue: {
    fontSize: "16px",
    fontWeight: 700,
  },
  sectionTitle: {
    fontSize: "12px",
    fontWeight: 700,
    margin: "16px 0 6px",
    color: "#e6edf3",
  },
  table: {
    display: "block",
    maxWidth: "100%",
    overflowX: "auto",
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "11px",
  },
  th: {
    textAlign: "left",
    color: "#8b949e",
    borderBottom: "1px solid #30363d",
    padding: "4px 6px",
  },
  td: {
    borderBottom: "1px solid #21262d",
    padding: "4px 6px",
    verticalAlign: "top",
  },
  eventsList: {
    maxHeight: "260px",
    overflowY: "auto",
  },
};

function useReportPolling(isOpen: boolean, projectId: string): FirebaseDebugReport | null {
  const [report, setReport] = useState<FirebaseDebugReport | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const buildReport = () => {
      setReport(
        buildFirebaseDebugReport(getFirestoreUsageTraceSnapshot(), {
          app: "studio",
          projectId,
        }),
      );
    };

    buildReport();
    const intervalId = window.setInterval(buildReport, POLL_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [isOpen, projectId]);

  return report;
}

interface FirebaseDebugPanelProps {
  externalSnapshot?: FirestoreTraceSnapshot | null;
  onClose: () => void;
  onReset?: () => void;
  onSetTracingEnabled?: (enabled: boolean) => void;
  route?: string;
}

export function FirebaseDebugPanel({
  externalSnapshot,
  onClose,
  onReset,
  onSetTracingEnabled,
  route,
}: FirebaseDebugPanelProps) {
  const location = useLocation();
  const projectId = typeof firebaseConfig.projectId === "string" ? firebaseConfig.projectId : "";
  const localReport = useReportPolling(externalSnapshot === undefined, projectId);
  const report = useMemo(
    () =>
      externalSnapshot
        ? buildFirebaseDebugReport(externalSnapshot, { app: "studio", projectId })
        : localReport,
    [externalSnapshot, localReport, projectId],
  );
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied">("idle");
  const [aiQueueCopyStatus, setAiQueueCopyStatus] = useState<"idle" | "copied">("idle");
  const traceEnabled = externalSnapshot?.enabled ?? isFirestoreUsageTraceEnabled();
  const displayedRoute = route ?? location.pathname;

  const recentEvents = useMemo(
    () => (report ? selectRecentEvents(report.events, 100) : []),
    [report],
  );

  const handleToggleTracing = () => {
    if (onSetTracingEnabled) {
      onSetTracingEnabled(!traceEnabled);
      return;
    }
    if (traceEnabled) {
      window.localStorage.removeItem(TRACE_STORAGE_FLAG);
    } else {
      window.localStorage.setItem(TRACE_STORAGE_FLAG, "1");
    }
    window.location.reload();
  };

  const handleReset = () => {
    if (onReset) {
      onReset();
      return;
    }
    resetFirestoreUsageTraceForTests({ app: "studio", enabled: true, route: displayedRoute });
  };

  const handleCopyReport = async () => {
    if (!report) {
      return;
    }
    await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    setCopyStatus("copied");
    window.setTimeout(() => setCopyStatus("idle"), 2000);
  };

  // Owner QA Amendment 6: copies the AI Processing queue state-transition trace (design IDs,
  // bucket membership, counts, stages, request generations). Deliberately separate from the
  // Firestore debug report above — different schema, different question.
  const handleCopyAiQueueTrace = async () => {
    const snapshot = await getAiQueueTraceSnapshot();
    await navigator.clipboard.writeText(JSON.stringify(snapshot, null, 2));
    setAiQueueCopyStatus("copied");
    window.setTimeout(() => setAiQueueCopyStatus("idle"), 2000);
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.panel}>
        <div style={styles.header}>
          <div>
            <p style={styles.title}>Firebase Debug — Studio</p>
            <p style={styles.subtitle}>
              project: {projectId || "(unknown)"} · route: {displayedRoute} · elapsed:{" "}
              {report ? formatElapsedMs(report.session.elapsedMs) : "—"} · tracing:{" "}
              {traceEnabled ? "active" : "inactive"}
            </p>
          </div>
          <button onClick={onClose} style={styles.button} type="button">
            Close
          </button>
        </div>

        <p style={styles.disclaimer}>{report?.accuracyDisclaimer}</p>

        <div style={styles.controls}>
          <button onClick={handleToggleTracing} style={styles.button} type="button">
            {traceEnabled ? "Disable tracing" : "Enable tracing"}
          </button>
          <button onClick={handleReset} style={styles.button} type="button">
            Reset
          </button>
          <button onClick={() => void handleCopyReport()} style={styles.button} type="button">
            {copyStatus === "copied" ? "Copied!" : "Copy Debug Report"}
          </button>
          <button onClick={() => void handleCopyAiQueueTrace()} style={styles.button} type="button">
            {aiQueueCopyStatus === "copied" ? "Copied!" : "Copy AI Queue Trace"}
          </button>
          <button
            onClick={() => {
              resetAiQueueTrace();
              setAiQueueCopyStatus("idle");
            }}
            style={styles.button}
            type="button"
          >
            Reset AI Queue Trace
          </button>
        </div>

        {report ? (
          <>
            <div style={styles.cardsRow}>
              {Object.entries(report.totals).map(([label, value]) => (
                <div key={label} style={styles.card}>
                  <div style={styles.cardLabel}>{TOTAL_LABELS[label] ?? label}</div>
                  <div style={styles.cardValue}>{value}</div>
                </div>
              ))}
            </div>

            <p style={styles.sectionTitle}>By action</p>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Action</th>
                  <th style={styles.th}>Read operations</th>
                  <th style={styles.th}>Documents returned</th>
                  <th style={styles.th}>Approx. billable reads</th>
                  <th style={styles.th}>Writes</th>
                  <th style={styles.th}>Callables</th>
                  <th style={styles.th}>Storage</th>
                  <th style={styles.th}>Collections</th>
                  <th style={styles.th}>Span</th>
                </tr>
              </thead>
              <tbody>
                {report.byAction.map((entry) => (
                  <tr key={entry.action}>
                    <td style={styles.td}>{entry.action}</td>
                    <td style={styles.td}>{entry.readOperations}</td>
                    <td style={styles.td}>{entry.documentsReturned}</td>
                    <td style={styles.td}>{entry.approximateBillableDocumentReads}</td>
                    <td style={styles.td}>{entry.writes}</td>
                    <td style={styles.td}>{entry.callables}</td>
                    <td style={styles.td}>{entry.storageAssetRequests}</td>
                    <td style={styles.td}>{entry.collections.join(", ")}</td>
                    <td style={styles.td}>{formatElapsedMs(entry.spanMs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <p style={styles.sectionTitle}>By route</p>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Route</th>
                  <th style={styles.th}>Read operations</th>
                  <th style={styles.th}>Documents returned</th>
                  <th style={styles.th}>Approx. billable reads</th>
                  <th style={styles.th}>Writes</th>
                  <th style={styles.th}>Callables</th>
                  <th style={styles.th}>Storage</th>
                </tr>
              </thead>
              <tbody>
                {report.byRoute.map((entry) => (
                  <tr key={entry.route}>
                    <td style={styles.td}>{entry.route}</td>
                    <td style={styles.td}>{entry.readOperations}</td>
                    <td style={styles.td}>{entry.documentsReturned}</td>
                    <td style={styles.td}>{entry.approximateBillableDocumentReads}</td>
                    <td style={styles.td}>{entry.writes}</td>
                    <td style={styles.td}>{entry.callables}</td>
                    <td style={styles.td}>{entry.storageAssetRequests}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <p style={styles.sectionTitle}>By collection</p>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Collection</th>
                  <th style={styles.th}>Read operations</th>
                  <th style={styles.th}>Documents returned</th>
                  <th style={styles.th}>Approx. billable reads</th>
                  <th style={styles.th}>Writes</th>
                </tr>
              </thead>
              <tbody>
                {report.byCollection.map((entry) => (
                  <tr key={entry.collection}>
                    <td style={styles.td}>{entry.collection}</td>
                    <td style={styles.td}>{entry.readOperations}</td>
                    <td style={styles.td}>{entry.documentsReturned}</td>
                    <td style={styles.td}>{entry.approximateBillableDocumentReads}</td>
                    <td style={styles.td}>{entry.writes}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <p style={styles.sectionTitle}>By callable</p>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Callable</th>
                  <th style={styles.th}>Invocations</th>
                  <th style={styles.th}>Succeeded</th>
                  <th style={styles.th}>Failed</th>
                  <th style={styles.th}>Avg duration</th>
                </tr>
              </thead>
              <tbody>
                {report.byCallable.map((entry) => (
                  <tr key={entry.callableName}>
                    <td style={styles.td}>{entry.callableName}</td>
                    <td style={styles.td}>{entry.invocationCount}</td>
                    <td style={styles.td}>{entry.successCount}</td>
                    <td style={styles.td}>{entry.failureCount}</td>
                    <td style={styles.td}>
                      {entry.averageDurationMs === null ? "—" : formatElapsedMs(entry.averageDurationMs)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <p style={styles.sectionTitle}>By write</p>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Write kind</th>
                  <th style={styles.th}>Count</th>
                  <th style={styles.th}>Succeeded</th>
                  <th style={styles.th}>Failed</th>
                  <th style={styles.th}>Avg duration</th>
                  <th style={styles.th}>Collections</th>
                </tr>
              </thead>
              <tbody>
                {report.byWrite.map((entry) => (
                  <tr key={entry.writeKind}>
                    <td style={styles.td}>{entry.writeKind}</td>
                    <td style={styles.td}>{entry.writeCount}</td>
                    <td style={styles.td}>{entry.successCount}</td>
                    <td style={styles.td}>{entry.failureCount}</td>
                    <td style={styles.td}>
                      {entry.averageDurationMs === null ? "—" : formatElapsedMs(entry.averageDurationMs)}
                    </td>
                    <td style={styles.td}>{entry.collections.join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <p style={styles.sectionTitle}>Storage assets</p>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Asset class</th>
                  <th style={styles.th}>Requests</th>
                  <th style={styles.th}>Hits</th>
                  <th style={styles.th}>Misses</th>
                  <th style={styles.th}>In-flight</th>
                  <th style={styles.th}>Versions</th>
                </tr>
              </thead>
              <tbody>
                {report.storage.map((entry) => (
                  <tr key={entry.assetClass}>
                    <td style={styles.td}>{entry.assetClass}</td>
                    <td style={styles.td}>{entry.requestCount}</td>
                    <td style={styles.td}>{entry.cacheHits}</td>
                    <td style={styles.td}>{entry.cacheMisses}</td>
                    <td style={styles.td}>{entry.inFlightReuses}</td>
                    <td style={styles.td}>{entry.contentVersions.join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <p style={styles.sectionTitle}>Fallbacks</p>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Route</th>
                  <th style={styles.th}>Action</th>
                  <th style={styles.th}>Asset</th>
                  <th style={styles.th}>Reason</th>
                </tr>
              </thead>
              <tbody>
                {report.fallbacks.map((entry, index) => (
                  <tr key={`${entry.timestamp}-${index}`}>
                    <td style={styles.td}>{entry.route ?? "—"}</td>
                    <td style={styles.td}>{entry.action ?? "—"}</td>
                    <td style={styles.td}>{entry.assetClass ?? "—"}</td>
                    <td style={styles.td}>{entry.reason ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <p style={styles.sectionTitle}>Errors</p>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Kind</th>
                  <th style={styles.th}>Route</th>
                  <th style={styles.th}>Subject</th>
                  <th style={styles.th}>Code</th>
                  <th style={styles.th}>Stage</th>
                  <th style={styles.th}>HTTP</th>
                  <th style={styles.th}>Duration</th>
                </tr>
              </thead>
              <tbody>
                {report.errors.map((entry, index) => (
                  <tr key={`${entry.timestamp}-${index}`}>
                    <td style={styles.td}>{entry.kind}</td>
                    <td style={styles.td}>{entry.route ?? "—"}</td>
                    <td style={styles.td}>{entry.subject ?? "—"}</td>
                    <td style={styles.td}>{entry.errorCode}</td>
                    <td style={styles.td}>{entry.failureStage ?? "—"}</td>
                    <td style={styles.td}>{entry.httpStatus ?? "—"}</td>
                    <td style={styles.td}>
                      {entry.durationMs === null ? "—" : formatElapsedMs(entry.durationMs)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <p style={styles.sectionTitle}>Recent events (newest first)</p>
            <div style={styles.eventsList}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Kind</th>
                    <th style={styles.th}>Elapsed</th>
                    <th style={styles.th}>Subject</th>
                    <th style={styles.th}>Route</th>
                    <th style={styles.th}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentEvents.map((event, index) => (
                    <tr key={`${event.timestamp}-${index}`}>
                      <td style={styles.td}>{event.kind}</td>
                      <td style={styles.td}>{formatElapsedMs(event.elapsedMs)}</td>
                      <td style={styles.td}>{formatEventSubject(event)}</td>
                      <td style={styles.td}>{formatEventRoute(event)}</td>
                      <td style={styles.td}>{formatEventAction(event)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
