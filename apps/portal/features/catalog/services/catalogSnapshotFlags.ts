export function generatedPortalCatalogEnabled(): boolean {
  return process.env.NEXT_PUBLIC_USE_GENERATED_CATALOG_SNAPSHOTS !== 'false';
}
