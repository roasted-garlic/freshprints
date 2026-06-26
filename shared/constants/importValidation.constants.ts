export const MIN_DPI = 300;

/** Single PNG import limit — must match `storage.rules` original upload cap. */
export const MAX_SINGLE_PNG_SIZE_BYTES = 150 * 1024 * 1024;

export const ALLOWED_EXTENSIONS = [".png"] as const;

export type AllowedImportExtension = (typeof ALLOWED_EXTENSIONS)[number];

export const PNG_MAGIC_BYTES = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;

export const METERS_PER_INCH = 0.0254;
