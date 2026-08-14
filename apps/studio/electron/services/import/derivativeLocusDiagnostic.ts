import { appendFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

import { app } from "electron";

import { PACKAGED_DERIVATIVE_LOCUS_DIAG } from "../../generated/packagedBuildConfig";

/**
 * DEV / diagnostic packaged stage trail for derivative-locus evidence.
 * Never writes image bytes, signed URLs, tokens, or credentials.
 */
export type DerivativeLocusDiagEvent = {
  stage: string;
  designId?: string;
  fileName?: string;
  jobId?: string;
  ok?: boolean;
  detail?: Record<string, string | number | boolean | null | undefined>;
};

const SINK_DIR = path.join(homedir(), ".fresh-prints", "diagnostics");
let sinkPath: string | null = null;
let enabled: boolean | null = null;

export function isDerivativeLocusDiagEnabled(): boolean {
  if (enabled !== null) {
    return enabled;
  }

  enabled =
    PACKAGED_DERIVATIVE_LOCUS_DIAG ||
    process.env.FP_DERIVATIVE_LOCUS_DIAG === "1" ||
    process.env.FP_DERIVATIVE_LOCUS_DIAG === "true";

  return enabled;
}

function resolveSinkPath(): string {
  if (sinkPath) {
    return sinkPath;
  }

  mkdirSync(SINK_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  sinkPath = path.join(SINK_DIR, `derivative-locus-${stamp}.jsonl`);
  return sinkPath;
}

export function getDerivativeLocusDiagSinkPath(): string | null {
  return isDerivativeLocusDiagEnabled() ? resolveSinkPath() : null;
}

export function logDerivativeLocusDiag(event: DerivativeLocusDiagEvent): void {
  if (!isDerivativeLocusDiagEnabled()) {
    return;
  }

  const line = JSON.stringify({
    scope: "derivative-locus",
    at: new Date().toISOString(),
    pid: process.pid,
    packaged: app.isPackaged,
    bakedDiag: PACKAGED_DERIVATIVE_LOCUS_DIAG,
    ...event,
  });

  try {
    appendFileSync(resolveSinkPath(), `${line}\n`, "utf8");
  } catch {
    // Diagnostic sink must never break import.
  }

  console.info(line);
}
