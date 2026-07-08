import type { BatchImportJobId } from "./batchImport.types";

export interface ReadSinglePngFileBytesRequest {
  filePath: string;
  includeDerivatives?: boolean;
}

export interface ReadBatchValidatedPngFileBytesRequest {
  filePath: string;
  jobId: BatchImportJobId;
  includeDerivatives?: boolean;
}

/** Legacy single-file callers may pass a path string; derivatives are opt-in via object request. */
export type ReadSelectedPngFileBytesRequest =
  | string
  | ReadSinglePngFileBytesRequest
  | ReadBatchValidatedPngFileBytesRequest;

export interface ReadPngFileBytesOptions {
  includeDerivatives: boolean;
}

export const DEFAULT_READ_PNG_FILE_BYTES_OPTIONS: ReadPngFileBytesOptions = {
  includeDerivatives: false,
};
