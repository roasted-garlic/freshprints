import { logger } from "firebase-functions";

type PipelineLogContext = Record<string, unknown>;

export function logPipelineEvent(event: string, context: PipelineLogContext = {}): void {
  logger.info("ai-pipeline", { event, ...context });
}
