import type { PortalCatalogCard } from "../../../packages/shared/src/catalog-snapshots/catalogSnapshot.types";
import { projectSmartProfileForAlgoliaIndex } from "../../../packages/shared/src/catalog-search/portalCatalogAlgoliaRecord";

export type PortalCatalogChangeClassification =
  | "card-only"
  | "index-filter"
  | "operational";

/** Deterministic JSON for equality checks (sorted object keys). */
function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function project(
  value: Record<string, unknown> | undefined,
  fields: readonly string[],
): Record<string, unknown> | null {
  if (!value) return null;
  return Object.fromEntries(fields.map((field) => [field, value[field]]));
}

// "status" is intentionally excluded here — publishPortal's own query is
// `where("status", "==", "ready")`, so only a transition into or out of
// "ready" can change the published card set. Every other status-to-status
// transition (imported -> processing, processing -> imported, imported ->
// rejected, etc.) is classified separately below via isReadyBoundaryChange,
// so a design's ordinary import/processing lifecycle churn does not each
// independently schedule a full, unbounded portal-catalog rebuild for a set
// membership that never actually changed (post-launch-catalog-and-
// processing-stability, Workstream C).
const INDEX_FILTER_FIELDS = [
  "title",
  "description",
  "categoryId",
  "tags",
  "createdAt",
  // Owner QA Amendment 3: readyAt is the default catalog ordering key, so a change to it must
  // republish the generated browse order.
  "readyAt",
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

const PUBLISHED_STATUS = "ready";

function isReadyBoundaryChange(
  before: Record<string, unknown> | undefined,
  after: Record<string, unknown> | undefined,
): boolean {
  const beforeIsReady = before?.status === PUBLISHED_STATUS;
  const afterIsReady = after?.status === PUBLISHED_STATUS;
  return beforeIsReady !== afterIsReady;
}

function isEitherSideReady(
  before: Record<string, unknown> | undefined,
  after: Record<string, unknown> | undefined,
): boolean {
  return before?.status === PUBLISHED_STATUS || after?.status === PUBLISHED_STATUS;
}

/**
 * Smart Profile index projection — search/facet fields only.
 * Provenance-only churn (shadow automation, validationWarnings) does not sync.
 */
function smartProfileIndexFieldsChanged(
  before: Record<string, unknown> | undefined,
  after: Record<string, unknown> | undefined,
): boolean {
  return (
    stableJson(projectSmartProfileForAlgoliaIndex(before?.smartProfile)) !==
    stableJson(projectSmartProfileForAlgoliaIndex(after?.smartProfile))
  );
}

function indexFilterFieldsChanged(
  before: Record<string, unknown> | undefined,
  after: Record<string, unknown> | undefined,
): boolean {
  if (
    stableJson(project(before, INDEX_FILTER_FIELDS)) !==
    stableJson(project(after, INDEX_FILTER_FIELDS))
  ) {
    return true;
  }
  return smartProfileIndexFieldsChanged(before, after);
}

/**
 * Amendment 9 P4-a: INDEX_FILTER field churn on documents that are never in the
 * published ready set cannot change portal search/facet assets, so it must not
 * schedule a full catalog scan.
 */
export function isNonReadyIndexFilterChurn(
  before: Record<string, unknown> | undefined,
  after: Record<string, unknown> | undefined,
): boolean {
  if (isReadyBoundaryChange(before, after)) return false;
  if (isEitherSideReady(before, after)) return false;
  return indexFilterFieldsChanged(before, after);
}

export function classifyPortalCatalogDesignChange(
  before: Record<string, unknown> | undefined,
  after: Record<string, unknown> | undefined,
): PortalCatalogChangeClassification {
  if (isReadyBoundaryChange(before, after)) {
    return "index-filter";
  }
  if (indexFilterFieldsChanged(before, after)) {
    // P4-a: neither side ready → published set unchanged → skip full schedule.
    if (!isEitherSideReady(before, after)) {
      return "operational";
    }
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
