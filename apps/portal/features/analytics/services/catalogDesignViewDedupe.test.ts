import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { nextCatalogDesignViewDedupeState } from './catalogDesignViewDedupe.ts'

describe('nextCatalogDesignViewDedupeState', () => {
  it('tracks the first open of A and ignores rerenders of A', () => {
    const first = nextCatalogDesignViewDedupeState({
      isOpen: true,
      designId: 'design-a',
      lastTrackedDesignId: null,
    })
    assert.deepEqual(first, { shouldTrack: true, nextLastTrackedDesignId: 'design-a' })

    const rerender = nextCatalogDesignViewDedupeState({
      isOpen: true,
      designId: 'design-a',
      lastTrackedDesignId: 'design-a',
    })
    assert.deepEqual(rerender, { shouldTrack: false, nextLastTrackedDesignId: 'design-a' })
  })

  it('tracks B when a still-open modal swaps A → B', () => {
    const swapped = nextCatalogDesignViewDedupeState({
      isOpen: true,
      designId: 'design-b',
      lastTrackedDesignId: 'design-a',
    })
    assert.deepEqual(swapped, { shouldTrack: true, nextLastTrackedDesignId: 'design-b' })
  })

  it('clears on close so a later reopen of A tracks again', () => {
    const closed = nextCatalogDesignViewDedupeState({
      isOpen: false,
      designId: 'design-a',
      lastTrackedDesignId: 'design-a',
    })
    assert.deepEqual(closed, { shouldTrack: false, nextLastTrackedDesignId: null })

    const reopened = nextCatalogDesignViewDedupeState({
      isOpen: true,
      designId: 'design-a',
      lastTrackedDesignId: closed.nextLastTrackedDesignId,
    })
    assert.deepEqual(reopened, { shouldTrack: true, nextLastTrackedDesignId: 'design-a' })
  })

  it('close never tracks (no compensating Catalog view)', () => {
    const closed = nextCatalogDesignViewDedupeState({
      isOpen: false,
      designId: 'design-a',
      lastTrackedDesignId: 'design-a',
    })
    assert.equal(closed.shouldTrack, false)
    assert.equal(closed.nextLastTrackedDesignId, null)
  })
})
