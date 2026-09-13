import type { Design } from "../types/design.types";

/** Studio Design Library browse/search membership scopes. */
export type DesignLibraryScope = "ready" | "archived";

/**
 * Authoritative Design Library membership for a UI scope.
 *
 * - ready: only `status === "ready"` (Firestore status wins over Algolia index membership)
 * - archived: `status === "archived"` and not image-purged (ADR-FP-084 Archive browse hide)
 */
export function isDesignVisibleInLibraryScope(
  design: Pick<Design, "status" | "assetsPurgedAt">,
  scope: DesignLibraryScope,
): boolean {
  if (scope === "ready") {
    return design.status === "ready";
  }

  if (design.status !== "archived") {
    return false;
  }

  // ADR-FP-084: purged archived designs leave ordinary Archive browse (metadata retained).
  if (design.assetsPurgedAt) {
    return false;
  }

  return true;
}

/** Keep designs that belong in the given library scope (order preserved). */
export function filterDesignsForLibraryScope<T extends Pick<Design, "status" | "assetsPurgedAt">>(
  designs: readonly T[],
  scope: DesignLibraryScope,
): T[] {
  return designs.filter((design) => isDesignVisibleInLibraryScope(design, scope));
}
