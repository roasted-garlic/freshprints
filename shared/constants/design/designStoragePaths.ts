export const DESIGN_STORAGE_ROOTS = {
  originals: "originals",
  thumbnails: "thumbnails",
  previews: "previews",
} as const;

export type DesignStorageRoot = (typeof DESIGN_STORAGE_ROOTS)[keyof typeof DESIGN_STORAGE_ROOTS];

const ORIGINAL_EXTENSION = ".png";
const DERIVATIVE_EXTENSION = ".webp";

export function getOriginalStoragePath(designId: string): string {
  return `/${DESIGN_STORAGE_ROOTS.originals}/${designId}${ORIGINAL_EXTENSION}`;
}

export function getThumbnailStoragePath(designId: string): string {
  return `/${DESIGN_STORAGE_ROOTS.thumbnails}/${designId}${DERIVATIVE_EXTENSION}`;
}

export function getPreviewStoragePath(designId: string): string {
  return `/${DESIGN_STORAGE_ROOTS.previews}/${designId}${DERIVATIVE_EXTENSION}`;
}

export function isCanonicalDesignStoragePath(path: string, root: DesignStorageRoot): boolean {
  if (root === DESIGN_STORAGE_ROOTS.originals) {
    return /^\/originals\/[A-Za-z0-9_-]+\.png$/.test(path);
  }

  return new RegExp(`^/${root}/[A-Za-z0-9_-]+\\.webp$`).test(path);
}
