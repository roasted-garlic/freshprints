/**
 * Active catalog lifecycle statuses (Phase 3D Step 6).
 * Production workflow (`queued`, `printed`) belongs on queue items — not designs.
 */
export const catalogDesignStatuses = [
  "imported",
  "processing",
  "ready",
  "rejected",
  "archived",
] as const;

/**
 * @deprecated Legacy production statuses on design documents.
 * Retained for read compatibility only — do not write new values.
 */
export const deprecatedDesignStatuses = ["queued", "printed"] as const;

/** Full union including deprecated values for Firestore reads and legacy records. */
export const designStatuses = [...catalogDesignStatuses, ...deprecatedDesignStatuses] as const;

export type CatalogDesignStatus = (typeof catalogDesignStatuses)[number];
export type DeprecatedDesignStatus = (typeof deprecatedDesignStatuses)[number];
export type DesignStatus = (typeof designStatuses)[number];

/** Statuses available in Design Library filters. */
export const designLibraryFilterStatuses = catalogDesignStatuses;

/** Statuses owner/admin may select in Edit Design (archive uses a separate action). */
export const editableCatalogDesignStatuses = [
  "imported",
  "processing",
  "ready",
  "rejected",
] as const satisfies readonly CatalogDesignStatus[];

export function isDesignStatus(value: unknown): value is DesignStatus {
  return typeof value === "string" && designStatuses.includes(value as DesignStatus);
}

export function isCatalogDesignStatus(value: unknown): value is CatalogDesignStatus {
  return typeof value === "string" && catalogDesignStatuses.includes(value as CatalogDesignStatus);
}

export function isDeprecatedDesignStatus(value: string): value is DeprecatedDesignStatus {
  return deprecatedDesignStatuses.includes(value as DeprecatedDesignStatus);
}

/** Returns false for deprecated production statuses that must not be written. */
export function isWritableDesignStatus(value: DesignStatus): boolean {
  return !isDeprecatedDesignStatus(value);
}
