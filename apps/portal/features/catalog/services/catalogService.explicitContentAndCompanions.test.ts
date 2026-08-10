import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { designHasMatchingDesignsHint, mapCatalogDesign } from './catalogService';
import type { CatalogDesign } from '../types/catalog.types';

const baseReadyDoc = {
  status: 'ready',
  title: 'Ready design',
  thumbnailPath: 'thumbs/ready.webp',
  width: 100,
  height: 100,
};

describe('mapCatalogDesign — isExplicitContent / companionDesignIds', () => {
  it('missing isExplicitContent maps to false (not undefined)', () => {
    const mapped = mapCatalogDesign('design-1', { ...baseReadyDoc });
    assert.ok(mapped);
    assert.equal(mapped?.isExplicitContent, false);
  });

  it('isExplicitContent: false on the doc maps to false', () => {
    const mapped = mapCatalogDesign('design-1', { ...baseReadyDoc, isExplicitContent: false });
    assert.equal(mapped?.isExplicitContent, false);
  });

  it('isExplicitContent: true on the doc maps to true', () => {
    const mapped = mapCatalogDesign('design-1', { ...baseReadyDoc, isExplicitContent: true });
    assert.equal(mapped?.isExplicitContent, true);
  });

  it('non-boolean isExplicitContent (legacy / malformed) maps to false — fails closed', () => {
    const mapped = mapCatalogDesign('design-1', { ...baseReadyDoc, isExplicitContent: 'true' });
    assert.equal(mapped?.isExplicitContent, false);
  });

  it('missing companionDesignIds maps to undefined (no neighbors)', () => {
    const mapped = mapCatalogDesign('design-1', { ...baseReadyDoc });
    assert.equal(mapped?.companionDesignIds, undefined);
  });

  it('string-array companionDesignIds are trimmed and mapped, preserving order', () => {
    const mapped = mapCatalogDesign('design-1', {
      ...baseReadyDoc,
      companionDesignIds: ['  design-2  ', 'design-3'],
    });
    assert.deepEqual(mapped?.companionDesignIds, ['design-2', 'design-3']);
  });

  it('blank / non-string entries are filtered out of companionDesignIds', () => {
    const mapped = mapCatalogDesign('design-1', {
      ...baseReadyDoc,
      companionDesignIds: ['design-2', '   ', 42, null, 'design-3'],
    });
    assert.deepEqual(mapped?.companionDesignIds, ['design-2', 'design-3']);
  });

  it('an array that filters down to empty maps to undefined (not an empty array)', () => {
    const mapped = mapCatalogDesign('design-1', {
      ...baseReadyDoc,
      companionDesignIds: ['   ', 42, null],
    });
    assert.equal(mapped?.companionDesignIds, undefined);
  });

  it('non-array companionDesignIds (legacy companionSetId string, etc.) maps to undefined', () => {
    const mapped = mapCatalogDesign('design-1', { ...baseReadyDoc, companionDesignIds: 'design-2' });
    assert.equal(mapped?.companionDesignIds, undefined);
  });
});

function stubDesign(id: string, companionDesignIds?: string[]): CatalogDesign {
  return {
    id,
    title: id,
    tags: [],
    thumbnailPath: `thumbs/${id}.webp`,
    width: 100,
    height: 100,
    requestCount: 0,
    favoriteCount: 0,
    companionDesignIds,
  };
}

describe('designHasMatchingDesignsHint — direct pairwise neighbors only, no clique/set lookup', () => {
  it('true when the design has one or more direct companionDesignIds', () => {
    assert.equal(designHasMatchingDesignsHint(stubDesign('a', ['b'])), true);
    assert.equal(designHasMatchingDesignsHint(stubDesign('a', ['b', 'c'])), true);
  });

  it('false when companionDesignIds is missing or empty', () => {
    assert.equal(designHasMatchingDesignsHint(stubDesign('a')), false);
    assert.equal(designHasMatchingDesignsHint(stubDesign('a', [])), false);
  });

  it('is per-design (not transitive) — a linked neighbor does not imply a match for unrelated designs', () => {
    // A↔D, B↔D, C↔D — owner's non-transitive example: A must not appear matched to B/C.
    const a = stubDesign('a', ['d']);
    const b = stubDesign('b', ['d']);
    const c = stubDesign('c', ['d']);
    const d = stubDesign('d', ['a', 'b', 'c']);

    assert.equal(designHasMatchingDesignsHint(a), true);
    assert.equal(designHasMatchingDesignsHint(b), true);
    assert.equal(designHasMatchingDesignsHint(c), true);
    assert.equal(designHasMatchingDesignsHint(d), true);
    // Hint is sourced only from each design's own array — never cross-referenced against
    // any other design's list, so there is no way for this hint to claim A↔B/A↔C.
    assert.deepEqual(a.companionDesignIds, ['d']);
    assert.deepEqual(b.companionDesignIds, ['d']);
    assert.deepEqual(c.companionDesignIds, ['d']);
  });
});
