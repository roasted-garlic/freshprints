import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { catalogNeedsFullClientHydrate } from '../utils/catalogNeedsFullClientHydrate';

describe('catalogNeedsFullClientHydrate', () => {
  it('is false for browse with at most one tag and no search', () => {
    assert.equal(catalogNeedsFullClientHydrate({ selectedTags: [] }), false);
    assert.equal(catalogNeedsFullClientHydrate({ selectedTags: ['ocean'] }), false);
    assert.equal(catalogNeedsFullClientHydrate({ searchQuery: '  ', selectedTags: [] }), false);
  });

  it('is true when search or multi-tag client filtering is active', () => {
    assert.equal(
      catalogNeedsFullClientHydrate({ searchQuery: 'sunset', selectedTags: [] }),
      true,
    );
    assert.equal(
      catalogNeedsFullClientHydrate({ selectedTags: ['ocean', 'halftone'] }),
      true,
    );
  });
});
