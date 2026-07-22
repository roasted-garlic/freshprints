/** Client search / multi-tag need the full matching set; otherwise page from the server. */
export function catalogNeedsFullClientHydrate(options: {
  searchQuery?: string;
  selectedTags: readonly string[];
}): boolean {
  return Boolean((options.searchQuery ?? '').trim() || options.selectedTags.length > 1);
}
