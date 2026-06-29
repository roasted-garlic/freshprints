import { logPipelineEvent } from "../lib/pipelineLog";

export class PipelinePhaseTimer {
  private readonly pipelineStartedAtMs = Date.now();
  private lastPhaseStartedAtMs = this.pipelineStartedAtMs;

  logPhase(event: string, context: Record<string, unknown> = {}): void {
    const now = Date.now();

    logPipelineEvent(event, {
      ...context,
      durationMs: now - this.lastPhaseStartedAtMs,
      totalPipelineMs: now - this.pipelineStartedAtMs,
      loggedAtMs: now,
    });

    this.lastPhaseStartedAtMs = now;
  }

  elapsedMs(): number {
    return Date.now() - this.pipelineStartedAtMs;
  }
}

export function logPipelineMilestone(
  event: string,
  context: Record<string, unknown> = {},
): void {
  logPipelineEvent(event, {
    ...context,
    loggedAtMs: Date.now(),
  });
}
