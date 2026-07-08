export class ImportOrchestrationError extends Error {
  readonly cleanupWarning: string | null;

  constructor(message: string, cleanupWarning: string | null = null) {
    super(message);
    this.name = "ImportOrchestrationError";
    this.cleanupWarning = cleanupWarning;
  }
}
