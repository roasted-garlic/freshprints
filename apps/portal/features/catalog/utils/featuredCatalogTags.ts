import type { CatalogTagOption } from '../types/catalog.types'

export type FeaturedTagPill = {
  tag: string
  count?: number
  isSelected: boolean
}

/**
 * Build featured pill rows from Firestore featured names ∩ current Algolia facet options.
 * Only tags that appear in the facet list (assigned to ≥1 ready design in context, with a count)
 * are shown — same eligibility as the normal checkbox list. Selection uses the same tag names.
 */
export function buildFeaturedTagPills(input: {
  featuredTagNames: readonly string[]
  facetedTags: readonly { tag: string; count?: number; isSelected: boolean }[]
  searchQuery?: string
}): FeaturedTagPill[] {
  const query = input.searchQuery?.trim().toLowerCase() ?? ''
  const featuredSet = new Set(
    input.featuredTagNames.map((name) => name.trim()).filter(Boolean),
  )

  const pills: FeaturedTagPill[] = []
  for (const faceted of input.facetedTags) {
    const trimmed = faceted.tag.trim()
    if (!trimmed || !featuredSet.has(trimmed)) {
      continue
    }
    // Algolia facet rows are ready-design counts; require a positive count when present.
    if (typeof faceted.count === 'number' && faceted.count <= 0) {
      continue
    }
    if (query && !trimmed.toLowerCase().includes(query)) {
      continue
    }

    pills.push({
      tag: trimmed,
      ...(typeof faceted.count === 'number' ? { count: faceted.count } : {}),
      isSelected: faceted.isSelected === true,
    })
  }

  return pills.sort((left, right) => left.tag.localeCompare(right.tag))
}

export function catalogTagOptionsFromFeaturedDocs(
  docs: readonly { id: string; name?: unknown; status?: unknown; isFeatured?: unknown }[],
): CatalogTagOption[] {
  const options: CatalogTagOption[] = []
  for (const docData of docs) {
    if (docData.status !== 'approved' || docData.isFeatured !== true) {
      continue
    }
    if (typeof docData.name !== 'string' || !docData.name.trim()) {
      continue
    }
    const name = docData.name.trim()
    options.push({ id: docData.id || name, name })
  }
  return options.sort((left, right) => left.name.localeCompare(right.name))
}
