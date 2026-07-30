import {
  ASSISTED_CREATION_ALLOWED_REFERENCE_TYPES,
  ASSISTED_CREATION_MAX_REFERENCE_BYTES,
  ASSISTED_CREATION_MAX_REFERENCE_IMAGES,
  ASSISTED_CREATION_MAX_REFERENCE_TOTAL_BYTES,
} from '@fresh-prints/shared/constants/assistedCreation/assistedCreation.constants';

/** Subset of the DOM `File` interface this validator needs — avoids a DOM dependency in tests. */
export interface ReferenceFileLike {
  size: number;
  type: string;
}

/**
 * Pure pre-upload gate for reference-image file selection — no Firebase/Storage calls, safe to
 * call before any upload begins. `existingRetainedBytes` is the sum of already-saved reference
 * images the caller intends to keep (0 for a brand-new submission; the sum of
 * `keptReferences[].sizeBytes` for an update where some existing images are retained). Removed or
 * replaced images must already be excluded from `existingRetainedBytes` by the caller — this
 * function only sums what it is given.
 */
export function validateAssistedCreationReferenceFiles(
  files: readonly ReferenceFileLike[],
  existingRetainedBytes = 0,
): string | null {
  if (files.length > ASSISTED_CREATION_MAX_REFERENCE_IMAGES) {
    return `Upload up to ${ASSISTED_CREATION_MAX_REFERENCE_IMAGES} reference images.`;
  }
  let newFilesBytes = 0;
  for (const file of files) {
    if (!(ASSISTED_CREATION_ALLOWED_REFERENCE_TYPES as readonly string[]).includes(file.type)) {
      return 'Reference images must be JPEG, PNG, or WebP.';
    }
    if (file.size <= 0 || file.size > ASSISTED_CREATION_MAX_REFERENCE_BYTES) {
      return `Each reference image must be ${ASSISTED_CREATION_MAX_REFERENCE_BYTES / (1024 * 1024)} MB or smaller.`;
    }
    newFilesBytes += file.size;
  }
  if (existingRetainedBytes + newFilesBytes > ASSISTED_CREATION_MAX_REFERENCE_TOTAL_BYTES) {
    return `Reference images must total ${ASSISTED_CREATION_MAX_REFERENCE_TOTAL_BYTES / (1024 * 1024)} MB or less.`;
  }
  return null;
}
