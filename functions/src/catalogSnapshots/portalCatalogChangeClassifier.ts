import { stableJson } from "./snapshotBuilders";
import type { PortalCatalogCard } from "../../../packages/shared/src/catalog-snapshots/catalogSnapshot.types";

export type PortalCatalogChangeClassification =
  | "card-only"
  | "index-filter"
  | "operational";

function project(
  value: Record<string, unknown> | undefined,
  fields: readonly string[],
): Record<string, unknown> | null {
  if (!value) return null;
  return Object.fromEntries(fields.map((field) => [field, value[field]]));
}

const INDEX_FILTER_FIELDS = [
  "status",
  "title",
  "description",
  "categoryId",
  "tags",
  "createdAt",
] as const;

const CARD_ONLY_FIELDS = [
  "thumbnailPath",
  "previewPath",
  "artworkBackgroundHex",
  "width",
  "height",
  "printWidthInches",
  "printHeightInches",
] as const;

export function classifyPortalCatalogDesignChange(
  before: Record<string, unknown> | undefined,
  after: Record<string, unknown> | undefined,
): PortalCatalogChangeClassification {
  if (
    stableJson(project(before, INDEX_FILTER_FIELDS)) !==
    stableJson(project(after, INDEX_FILTER_FIELDS))
  ) {
    return "index-filter";
  }
  if (
    stableJson(project(before, CARD_ONLY_FIELDS)) !==
    stableJson(project(after, CARD_ONLY_FIELDS))
  ) {
    return "card-only";
  }
  return "operational";
}

export function mergePortalCardOverrides(
  priorCards: readonly PortalCatalogCard[],
  card: PortalCatalogCard,
): PortalCatalogCard[] {
  const merged = new Map(priorCards.map((entry) => [entry.id, entry]));
  merged.set(card.id, card);
  return [...merged.values()].sort((left, right) => left.id.localeCompare(right.id));
}

export function hasMatchingPortalCardOverride(
  priorCards: readonly PortalCatalogCard[],
  card: PortalCatalogCard,
): boolean {
  const prior = priorCards.find((entry) => entry.id === card.id);
  return prior !== undefined && stableJson(prior) === stableJson(card);
}
