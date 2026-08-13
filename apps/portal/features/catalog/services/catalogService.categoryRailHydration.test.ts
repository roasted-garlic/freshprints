import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  CATALOG_DISCOVERY_RAIL_LIMIT,
  selectTopPopularCategoryRails,
  takeCatalogDiscoveryRail,
} from '@fresh-prints/shared/utils/catalogDiscoveryRanking';

function design(id: string, categoryId: string, requestCount: number) {
  return {
    id,
    categoryId,
    requestCount,
    favoriteCount: 0,
    createdAtMs: 1_000 - Number(id.replace(/\D/g, '') || 0),
  };
}

describe('Discover category rail selection + limit contracts', () => {
  it('selected category with 10 ready designs can supply all 10 to the rail (≤25)', () => {
    const designs = Array.from({ length: 10 }, (_, index) =>
      design(`p${index}`, 'patriotic', 10 + index),
    );
    const rails = selectTopPopularCategoryRails(designs, [
      { id: 'patriotic', name: 'Patriotic & Americana' },
    ]);
    assert.equal(rails.length, 1);
    assert.equal(rails[0]!.designs.length, 10);
    assert.ok(rails[0]!.designs.length <= CATALOG_DISCOVERY_RAIL_LIMIT);
  });

  it('rail cards cap at CATALOG_DISCOVERY_RAIL_LIMIT (25) when membership exceeds 25', () => {
    const designs = Array.from({ length: 40 }, (_, index) =>
      design(`c${index}`, 'cat-big', 100 - index),
    );
    const rails = selectTopPopularCategoryRails(designs, [{ id: 'cat-big', name: 'Big Category' }]);
    assert.equal(rails.length, 1);
    assert.equal(rails[0]!.designs.length, CATALOG_DISCOVERY_RAIL_LIMIT);
    assert.equal(takeCatalogDiscoveryRail(designs, CATALOG_DISCOVERY_RAIL_LIMIT).length, 25);
  });

  it('pool underfill still selects a rail when min designs are present in the pool', () => {
    // Selection uses pool membership; hydration (separate) fills toward true ready count.
    const poolSlice = Array.from({ length: 3 }, (_, index) =>
      design(`pool${index}`, 'patriotic', 5),
    );
    const rails = selectTopPopularCategoryRails(poolSlice, [
      { id: 'patriotic', name: 'Patriotic & Americana' },
    ]);
    assert.equal(rails.length, 1);
    assert.equal(rails[0]!.designs.length, 3);
  });
});
