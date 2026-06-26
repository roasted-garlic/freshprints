export type ImportLimitErrorCode = "FILE_TOO_LARGE";

export class ImportLimitExceededError extends Error {
  readonly code: ImportLimitErrorCode;

  constructor(message: string, code: ImportLimitErrorCode = "FILE_TOO_LARGE") {
    super(message);
    this.name = "ImportLimitExceededError";
    this.code = code;
  }
}
