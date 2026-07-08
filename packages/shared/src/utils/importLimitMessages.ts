import { MAX_SINGLE_PNG_SIZE_BYTES } from "../constants/importValidation.constants";
import {
  MAX_EXTRACTED_BYTES,
  MAX_ZIP_SIZE_BYTES,
} from "../constants/import/batchImportLimits.constants";
import { formatFileSize } from "./formatFileSize";

export function formatPngSizeLimitExceededMessage(): string {
  return `The PNG file exceeds the maximum allowed size of ${formatFileSize(MAX_SINGLE_PNG_SIZE_BYTES)}.`;
}

export function formatZipSizeLimitExceededMessage(): string {
  return `The selected ZIP file exceeds the ${formatFileSize(MAX_ZIP_SIZE_BYTES)} import limit.`;
}

export function formatZipExtractedSizeLimitExceededMessage(): string {
  return `The ZIP archive would exceed the ${formatFileSize(MAX_EXTRACTED_BYTES)} extracted size limit.`;
}
