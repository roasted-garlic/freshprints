import type { ReactNode } from "react";

import { firebaseConfig } from "../../config/env";
import { isDerivativeLocusDiagEnabled } from "../utils/derivativeLocusDiagnostic";

const REQUIRED_DIAG_PROJECT = "fresh-prints-dev";

/**
 * Fail-closed gate for derivative-locus diagnostic packaged builds.
 * Blocks the app if baked Firebase project is not fresh-prints-dev.
 */
export function DiagnosticProjectGate({ children }: { children: ReactNode }) {
  const projectId =
    typeof firebaseConfig.projectId === "string" ? firebaseConfig.projectId.trim() : "";
  const diagnostic = isDerivativeLocusDiagEnabled();

  if (diagnostic && projectId !== REQUIRED_DIAG_PROJECT) {
    return (
      <div
        role="alert"
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          background: "#1a0a0a",
          color: "#ffe8e8",
          fontFamily: "Segoe UI, sans-serif",
        }}
      >
        <div style={{ maxWidth: 560 }}>
          <h1 style={{ marginTop: 0 }}>Diagnostic build blocked</h1>
          <p>
            This packaged Studio diagnostic must connect only to{" "}
            <code>{REQUIRED_DIAG_PROJECT}</code>. Runtime project is{" "}
            <code>{projectId || "(missing)"}</code>.
          </p>
          <p>Import and Firebase writes are refused. Close this app and rebuild against DEV.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {diagnostic ? (
        <div
          role="status"
          style={{
            position: "sticky",
            top: 0,
            zIndex: 10000,
            padding: "0.4rem 0.75rem",
            background: "#0b3d2e",
            color: "#e8fff6",
            fontSize: 13,
            fontFamily: "Segoe UI, sans-serif",
            borderBottom: "1px solid #1f6b52",
          }}
        >
          DIAGNOSTIC BUILD — Firebase project <strong>{projectId}</strong> — derivative locus
          logging on — not a release candidate
        </div>
      ) : null}
      {children}
    </>
  );
}
