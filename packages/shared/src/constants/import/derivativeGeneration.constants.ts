/** Thumbnail max dimensions — fit inside box, preserve aspect ratio, no upscaling */
export const THUMBNAIL_MAX_WIDTH_PX = 320;
export const THUMBNAIL_MAX_HEIGHT_PX = 320;
export const THUMBNAIL_WEBP_QUALITY = 80;

/** Preview max dimensions — fit inside box, preserve aspect ratio, no upscaling */
export const PREVIEW_MAX_WIDTH_PX = 1280;
export const PREVIEW_MAX_HEIGHT_PX = 1280;
export const PREVIEW_WEBP_QUALITY = 85;

export const DERIVATIVE_WEBP_CONTENT_TYPE = "image/webp" as const;

/** When false, images smaller than max dimensions are not enlarged */
export const DERIVATIVE_ALLOW_UPSCALE = false;

/** Encode WebP with alpha when the source PNG has transparency */
export const DERIVATIVE_PRESERVE_ALPHA = true;

/** Global main-process limit for sharp decode/encode (memory protection) */
export const DERIVATIVE_PROCESSING_CONCURRENCY = 1;

/** Firebase Storage rule cap for thumbnail and preview WebP objects */
export const MAX_DERIVATIVE_FILE_SIZE_BYTES = 10 * 1024 * 1024;
