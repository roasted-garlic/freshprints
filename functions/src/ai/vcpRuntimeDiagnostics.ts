import { createHash } from "node:crypto";

import { logPipelineEvent } from "../lib/pipelineLog";

export function isVcpRuntimeDiagnosticsEnabled(): boolean {
  return process.env.GCLOUD_PROJECT === "fresh-prints-dev";
}

export function sha256Prompt(prompt: string): string {
  return createHash("sha256").update(prompt, "utf8").digest("hex");
}

export function buildPromptVcpDiagnostic(prompt: string): Record<string, unknown> {
  return {
    effectivePromptSha256: sha256Prompt(prompt),
    promptContainsVisualContextProfile: /visualContextProfile/i.test(prompt),
    promptContainsVisualContextV1: /visual-context-v1/i.test(prompt),
  };
}

export function classifyVcpParse(rawKeyPresent: boolean, parsedPresent: boolean): string {
  if (!rawKeyPresent) return "missing";
  return parsedPresent ? "valid" : "invalid";
}

export function logVcpRuntimeDiagnostic(event: string, fields: Record<string, unknown>): void {
  if (!isVcpRuntimeDiagnosticsEnabled()) return;
  logPipelineEvent(event, fields);
}
