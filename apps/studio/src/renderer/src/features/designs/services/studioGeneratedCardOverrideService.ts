import type { PortalCatalogCard } from "@fresh-prints/shared/catalog-snapshots/catalogSnapshot.types";
import { traceGeneratedCardOverride } from "@fresh-prints/shared/utils/firestoreUsageTrace";

interface SessionCardOverride {
  card: PortalCatalogCard;
  createdAtMs: number;
}

export interface GeneratedReadyEntryLike {
  id: string;
  title: string;
  description?: string;
  categoryId?: string;
  tags: string[];
  createdAtMs: number;
}

let sessionScope: string | null = null;
const overrides = new Map<string, SessionCardOverride>();

function publicCardFields(card: PortalCatalogCard): unknown {
  return {
    id: card.id,
    title: card.title,
    description: card.description,
    categoryId: card.categoryId,
    tags: card.tags,
    thumbnailPath: card.thumbnailPath,
    previewPath: card.previewPath,
    artworkBackgroundHex: card.artworkBackgroundHex,
    width: card.width,
    height: card.height,
    printWidthInches: card.printWidthInches,
    printHeightInches: card.printHeightInches,
  };
}

function cardsMatch(left: PortalCatalogCard, right: PortalCatalogCard): boolean {
  return JSON.stringify(publicCardFields(left)) === JSON.stringify(publicCardFields(right));
}

function setSessionScope(nextScope: string | null): void {
  if (sessionScope === nextScope) return;
  for (const designId of overrides.keys()) {
    traceGeneratedCardOverride("removed", designId);
  }
  overrides.clear();
  sessionScope = nextScope;
}

function put(card: PortalCatalogCard, createdAtMs: number): void {
  overrides.set(card.id, { card: { ...card, tags: [...card.tags] }, createdAtMs });
  traceGeneratedCardOverride("created", card.id);
}

function remove(designId: string): void {
  if (!overrides.delete(designId)) return;
  traceGeneratedCardOverride("removed", designId);
}

function apply(
  cards: ReadonlyMap<string, PortalCatalogCard>,
  contentVersion?: string,
): Map<string, PortalCatalogCard> {
  const result = new Map(cards);
  for (const [designId, override] of overrides) {
    const generated = cards.get(designId);
    if (!generated) continue;
    if (cardsMatch(generated, override.card)) {
      overrides.delete(designId);
      traceGeneratedCardOverride("superseded", designId, contentVersion);
      continue;
    }
    result.set(designId, { ...generated, ...override.card, tags: [...override.card.tags] });
    traceGeneratedCardOverride("applied", designId, contentVersion);
  }
  return result;
}

function applyReadyEntries<T extends GeneratedReadyEntryLike>(entries: readonly T[]): T[] {
  return entries.map((entry) => {
    const override = overrides.get(entry.id);
    if (!override) return entry;
    return {
      ...entry,
      title: override.card.title,
      description: override.card.description,
      categoryId: override.card.categoryId,
      tags: [...override.card.tags],
      createdAtMs: override.createdAtMs,
    };
  });
}

export const studioGeneratedCardOverrideService = {
  apply,
  applyReadyEntries,
  put,
  remove,
  setSessionScope,
};
