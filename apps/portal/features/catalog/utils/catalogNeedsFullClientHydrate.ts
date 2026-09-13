/** Client text search needs the full matching set; otherwise page from the server. */
export function catalogNeedsFullClientHydrate(options: {
  searchQuery?: string;
}): boolean {
  return Boolean((options.searchQuery ?? '').trim());
}
