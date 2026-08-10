import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { buildFeaturedTagPills, catalogTagOptionsFromFeaturedDocs } from './featuredCatalogTags'

describe('featuredCatalogTags', () => {
  it('only builds pills for featured tags that appear in Algolia facets with a count', () => {
    const pills = buildFeaturedTagPills({
      featuredTagNames: ['exclusive', 'vip drop', 'orphan-featured'],
      facetedTags: [
        { tag: 'exclusive', count: 4, isSelected: true },
        { tag: 'summer', count: 12, isSelected: false },
        { tag: 'vip drop', count: 0, isSelected: false },
      ],
      searchQuery: '',
    })

    assert.deepEqual(pills, [{ tag: 'exclusive', count: 4, isSelected: true }])
  })

  it('filters featured pills by the modal search query', () => {
    const pills = buildFeaturedTagPills({
      featuredTagNames: ['exclusive', 'summer'],
      facetedTags: [
        { tag: 'exclusive', count: 4, isSelected: false },
        { tag: 'summer', count: 12, isSelected: false },
      ],
      searchQuery: 'ex',
    })

    assert.deepEqual(pills, [{ tag: 'exclusive', count: 4, isSelected: false }])
  })

  it('does not invent pills for featured names missing from the facet list', () => {
    const pills = buildFeaturedTagPills({
      featuredTagNames: ['brand-new'],
      facetedTags: [],
    })
    assert.deepEqual(pills, [])
  })

  it('maps only approved featured docs to options', () => {
    const options = catalogTagOptionsFromFeaturedDocs([
      { id: 'a', name: 'alpha', status: 'approved', isFeatured: true },
      { id: 'b', name: 'beta', status: 'archived', isFeatured: true },
      { id: 'c', name: 'gamma', status: 'approved', isFeatured: false },
    ])
    assert.deepEqual(options, [{ id: 'a', name: 'alpha' }])
  })
})
