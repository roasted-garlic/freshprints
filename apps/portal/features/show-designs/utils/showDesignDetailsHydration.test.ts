import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { CatalogDesign } from '../../catalog/types/catalog.types';
import { mapPortalShowCatalogDesignCardToCatalogDesign } from './mapPortalShowCatalogDesignCardToCatalogDesign';
import { hydratePortalShowDesignForDetails } from './showDesignDetailsHydration';

function design(id: string, description?: string): CatalogDesign {
  return {
    id,
    title: `Design ${id}`,
    description,
    tags: [],
    thumbnailPath: `thumbnails/${id}.webp`,
    previewPath: `previews/${id}.webp`,
    width: 2400,
    height: 3000,
    requestCount: 0,
    favoriteCount: 0,
  };
}

function compactShowDesign(id: string): CatalogDesign {
  const mapped = mapPortalShowCatalogDesignCardToCatalogDesign({
    id,
    title: `Design ${id}`,
    thumbnailPath: `thumbnails/${id}.webp`,
    previewPath: `previews/${id}.webp`,
    width: 2400,
    height: 3000,
    requestCount: 0,
    favoriteCount: 0,
  });
  assert.ok(mapped);
  assert.equal(mapped.description, undefined);
  return mapped;
}

describe('hydratePortalShowDesignForDetails', () => {
  it('hydrates a compact Next Show card through the authoritative ready-design path', async () => {
    const compact = compactShowDesign('next-show-design');
    const requestedIds: string[][] = [];

    const hydrated = await hydratePortalShowDesignForDetails(
      compact,
      new Set(['next-show-design']),
      async (ids) => {
        requestedIds.push(ids);
        return [design('next-show-design', 'A description from the catalog document.')];
      },
    );

    assert.equal(hydrated?.description, 'A description from the catalog document.');
    assert.deepEqual(requestedIds, [['next-show-design']]);
  });

  it('uses the same hydration for Added to Shows This Week without changing rail identity', async () => {
    const compact = compactShowDesign('this-week-design');
    const hydrated = await hydratePortalShowDesignForDetails(
      compact,
      new Set(['this-week-design']),
      async (ids) => [design(ids[0]!, 'The same persisted catalog description.')],
    );

    assert.deepEqual(hydrated, {
      ...design('this-week-design', 'The same persisted catalog description.'),
    });
    assert.equal(hydrated?.id, compact.id);
  });

  it('preserves ordinary catalog designs and does not perform a second read', async () => {
    let loaderCalled = false;
    const ordinary = design('ordinary', 'Already hydrated description.');

    const result = await hydratePortalShowDesignForDetails(
      ordinary,
      new Set(['ordinary']),
      async () => {
        loaderCalled = true;
        return [];
      },
    );

    assert.equal(result, ordinary);
    assert.equal(loaderCalled, false);
  });

  it('preserves an explicitly empty authoritative description', async () => {
    const result = await hydratePortalShowDesignForDetails(
      compactShowDesign('empty-description'),
      new Set(['empty-description']),
      async () => [design('empty-description', '')],
    );

    assert.ok(result);
    assert.equal(result.description, '');
  });

  it('does not borrow stale description data when switching designs', async () => {
    const compactA = compactShowDesign('design-a');
    const compactB = compactShowDesign('design-b');
    const hydratedA = await hydratePortalShowDesignForDetails(
      compactA,
      new Set(['design-a', 'design-b']),
      async () => [design('design-a', 'Description A')],
    );
    const hydratedB = await hydratePortalShowDesignForDetails(
      compactB,
      new Set(['design-a', 'design-b']),
      async () => [design('design-b', 'Description B')],
    );

    assert.equal(hydratedA?.description, 'Description A');
    assert.equal(hydratedB?.description, 'Description B');
    assert.notEqual(hydratedB?.description, hydratedA?.description);
  });

  it('fails closed when the compact card no longer resolves to a ready catalog design', async () => {
    const result = await hydratePortalShowDesignForDetails(
      compactShowDesign('removed-design'),
      new Set(['removed-design']),
      async () => [],
    );

    assert.equal(result, null);
  });
});
