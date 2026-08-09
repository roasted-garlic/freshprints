/**
 * Stage 4: generated Portal catalog snapshots are retired for search/facets.
 * Flag retained as always-false so accidental env re-enable cannot restore Storage reads
 * without also restoring call sites (containment tests forbid call sites).
 */
export function generatedPortalCatalogEnabled(): boolean {
  return false;
}
