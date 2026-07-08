type PipelineLogContext = Record<string, unknown>;

/**
 * Structured dev-only logs for AI import/processing verification.
 * Disabled in production builds to avoid console noise.
 */
export function logPipelineEvent(event: string, context: PipelineLogContext = {}): void {
  if (!import.meta.env.DEV) {
    return;
  }

  console.info(
    JSON.stringify({
      scope: "ai-pipeline",
      event,
      at: new Date().toISOString(),
      ...context,
    }),
  );
}
