import type { PortalCatalogCard } from "./catalogSnapshot.types";

export function applyPortalCatalogCardOverrides(
  baseCards: ReadonlyMap<string, PortalCatalogCard>,
  overrides: readonly PortalCatalogCard[],
): Map<string, PortalCatalogCard> {
  const result = new Map(baseCards);
  for (const card of overrides) {
    if (result.has(card.id)) result.set(card.id, card);
  }
  return result;
}
