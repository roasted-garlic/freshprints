import type { CatalogDesign } from '../../catalog/types/catalog.types';

export type ReadyCatalogDesignLoader = (designIds: string[]) => Promise<CatalogDesign[]>;

/**
 * Resolves the authoritative catalog object for compact homepage show-rail cards before details
 * open. The public show-card contract stays compact; an explicit empty description remains a real
 * empty value, and an unavailable design fails closed instead of displaying stale card data.
 */
export async function hydratePortalShowDesignForDetails(
  design: CatalogDesign,
  showRailDesignIds: ReadonlySet<string>,
  loadReadyDesignsByIds: ReadyCatalogDesignLoader,
): Promise<CatalogDesign | null> {
  if (!showRailDesignIds.has(design.id) || design.description !== undefined) {
    return design;
  }

  const hydratedDesigns = await loadReadyDesignsByIds([design.id]);
  return hydratedDesigns.find((candidate) => candidate.id === design.id) ?? null;
}
