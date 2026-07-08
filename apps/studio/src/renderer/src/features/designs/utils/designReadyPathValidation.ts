import {
  getOriginalStoragePath,
  getPreviewStoragePath,
  getThumbnailStoragePath,
  isCanonicalDesignStoragePath,
} from "@fresh-prints/shared/constants/design/designStoragePaths";
import type { Design } from "../types/design.types";

export interface MarkDesignReadyPaths {
  originalPath: string;
  thumbnailPath: string;
  previewPath: string;
}

export interface DesignReadyPathValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateDesignReadyPaths(
  design: Pick<Design, "id" | "originalPath">,
  paths: MarkDesignReadyPaths,
): DesignReadyPathValidationResult {
  const errors: string[] = [];
  const designId = design.id;

  if (!paths.originalPath) {
    errors.push("originalPath is required.");
  } else if (paths.originalPath !== getOriginalStoragePath(designId)) {
    errors.push("originalPath must match the canonical original path for the design.");
  } else if (!isCanonicalDesignStoragePath(paths.originalPath, "originals")) {
    errors.push("originalPath must be a canonical originals path.");
  }

  if (!design.originalPath) {
    errors.push("The design record does not have an originalPath set.");
  } else if (paths.originalPath && design.originalPath !== paths.originalPath) {
    errors.push("originalPath does not match the design record.");
  }

  if (!paths.thumbnailPath) {
    errors.push("thumbnailPath is required.");
  } else if (paths.thumbnailPath !== getThumbnailStoragePath(designId)) {
    errors.push("thumbnailPath must match the canonical thumbnail path for the design.");
  } else if (!isCanonicalDesignStoragePath(paths.thumbnailPath, "thumbnails")) {
    errors.push("thumbnailPath must be a canonical thumbnails path.");
  }

  if (!paths.previewPath) {
    errors.push("previewPath is required.");
  } else if (paths.previewPath !== getPreviewStoragePath(designId)) {
    errors.push("previewPath must match the canonical preview path for the design.");
  } else if (!isCanonicalDesignStoragePath(paths.previewPath, "previews")) {
    errors.push("previewPath must be a canonical previews path.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
