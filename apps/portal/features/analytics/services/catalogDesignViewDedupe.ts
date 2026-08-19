export function nextCatalogDesignViewDedupeState(input: {
  isOpen: boolean
  designId: string | null
  lastTrackedDesignId: string | null
}): { shouldTrack: boolean; nextLastTrackedDesignId: string | null } {
  if (!input.isOpen || !input.designId) {
    return { shouldTrack: false, nextLastTrackedDesignId: null }
  }
  if (input.lastTrackedDesignId === input.designId) {
    return { shouldTrack: false, nextLastTrackedDesignId: input.lastTrackedDesignId }
  }
  return { shouldTrack: true, nextLastTrackedDesignId: input.designId }
}
