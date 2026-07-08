export function normalizeCatalogPath(catalogPath: string | undefined): string | null {
  const trimmedPath = catalogPath?.trim() ?? "";

  if (!trimmedPath) {
    return null;
  }

  return trimmedPath;
}
