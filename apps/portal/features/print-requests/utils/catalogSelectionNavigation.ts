export function buildCatalogSelectionHref(
  printRequestId: string,
  options?: { seedDesignId?: string },
): string {
  const params = new URLSearchParams({
    mode: 'request-selection',
    requestId: printRequestId,
  });

  if (options?.seedDesignId?.trim()) {
    params.set('seedDesignId', options.seedDesignId.trim());
  }

  return `/catalog?${params.toString()}`;
}
