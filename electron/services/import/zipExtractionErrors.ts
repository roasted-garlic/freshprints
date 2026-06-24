export type ZipExtractionErrorCode =
  | "FILE_TOO_LARGE"
  | "ZIP_COMPRESSION_RATIO_EXCEEDED"
  | "ZIP_CORRUPT"
  | "ZIP_EXTRACTED_SIZE_EXCEEDED"
  | "ZIP_INVALID_ARCHIVE"
  | "ZIP_PATH_TRAVERSAL"
  | "ZIP_SYMLINK_ENTRY"
  | "ZIP_TOO_MANY_ENTRIES";

export class ZipExtractionError extends Error {
  readonly code: ZipExtractionErrorCode;

  constructor(code: ZipExtractionErrorCode, message: string) {
    super(message);
    this.name = "ZipExtractionError";
    this.code = code;
  }
}
