export const STAFF_ARTWORK_STORAGE_ROOT = "staff-artwork" as const;

export const STAFF_ARTWORK_OWNED_STORAGE_PATH_FIELDS = [
  "sourceStoragePath",
  "productionStoragePath",
  "interactiveEnhancedProductionStoragePath",
  "previewStoragePath",
  "thumbnailStoragePath",
] as const;

export type StaffArtworkOwnedStoragePathField =
  (typeof STAFF_ARTWORK_OWNED_STORAGE_PATH_FIELDS)[number];

function assertId(value: string): string {
  const id = value.trim();
  if (!id || !/^[A-Za-z0-9_-]+$/.test(id)) throw new Error("staffArtworkId is required");
  return id;
}

export function getStaffArtworkStoragePath(
  staffArtworkId: string,
  fileName: "source" | "production.png" | "production.interactive.png" | "preview.webp" | "thumbnail.webp",
): string {
  return `/${STAFF_ARTWORK_STORAGE_ROOT}/${assertId(staffArtworkId)}/${fileName}`;
}

export function getStaffArtworkSourceStoragePath(staffArtworkId: string): string {
  return getStaffArtworkStoragePath(staffArtworkId, "source");
}

export function getStaffArtworkProductionStoragePath(staffArtworkId: string): string {
  return getStaffArtworkStoragePath(staffArtworkId, "production.png");
}

export function getStaffArtworkInteractiveProductionStoragePath(staffArtworkId: string): string {
  return getStaffArtworkStoragePath(staffArtworkId, "production.interactive.png");
}

export function getStaffArtworkPreviewStoragePath(staffArtworkId: string): string {
  return getStaffArtworkStoragePath(staffArtworkId, "preview.webp");
}

export function getStaffArtworkThumbnailStoragePath(staffArtworkId: string): string {
  return getStaffArtworkStoragePath(staffArtworkId, "thumbnail.webp");
}

const STAFF_ARTWORK_OBJECT_PATTERN =
  /^\/staff-artwork\/([A-Za-z0-9_-]+)\/(source|production\.png|production\.interactive\.png|preview\.webp|thumbnail\.webp)$/;

export type StaffArtworkStorageFileName =
  | "source"
  | "production.png"
  | "production.interactive.png"
  | "preview.webp"
  | "thumbnail.webp";

export function parseStaffArtworkStoragePath(path: string): {
  staffArtworkId: string;
  fileName: StaffArtworkStorageFileName;
} | null {
  const match = STAFF_ARTWORK_OBJECT_PATTERN.exec(path.trim());
  if (!match) return null;
  return { staffArtworkId: match[1], fileName: match[2] as StaffArtworkStorageFileName };
}

export function isCanonicalStaffArtworkStoragePath(path: string, staffArtworkId?: string): boolean {
  const parsed = parseStaffArtworkStoragePath(path);
  return Boolean(parsed && (!staffArtworkId || parsed.staffArtworkId === staffArtworkId));
}
