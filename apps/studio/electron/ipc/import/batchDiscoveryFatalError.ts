export class BatchDiscoveryFatalError extends Error {
  readonly cleanupZipTemp: boolean;
  readonly code: string;

  constructor(code: string, message: string, cleanupZipTemp = false) {
    super(message);
    this.name = "BatchDiscoveryFatalError";
    this.code = code;
    this.cleanupZipTemp = cleanupZipTemp;
  }
}
