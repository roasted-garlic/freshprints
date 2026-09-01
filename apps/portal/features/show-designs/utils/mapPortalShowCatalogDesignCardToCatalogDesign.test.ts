import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { mapPortalShowCatalogDesignCardToCatalogDesign } from './mapPortalShowCatalogDesignCardToCatalogDesign';

describe('mapPortalShowCatalogDesignCardToCatalogDesign', () => {
  it('maps a ready show card into a CatalogDesign', () => {
    const mapped = mapPortalShowCatalogDesignCardToCatalogDesign({
      id: 'design-1',
      title: 'Test design',
      thumbnailPath: 'designs/design-1/thumb.webp',
      previewPath: 'designs/design-1/preview.webp',
      categoryId: 'cat-1',
      tags: ['tag-a'],
      isExplicitContent: true,
      width: 2400,
      height: 3000,
      requestCount: 4,
      favoriteCount: 2,
      updatedAtMs: 1_700_000_000_000,
      artworkBackgroundHex: '#112233',
    });

    assert.deepEqual(mapped, {
      id: 'design-1',
      title: 'Test design',
      categoryId: 'cat-1',
      tags: ['tag-a'],
      thumbnailPath: 'designs/design-1/thumb.webp',
      previewPath: 'designs/design-1/preview.webp',
      artworkBackgroundHex: '#112233',
      width: 2400,
      height: 3000,
      updatedAtMs: 1_700_000_000_000,
      requestCount: 4,
      favoriteCount: 2,
      isExplicitContent: true,
    });
  });

  it('rejects cards missing thumbnail or dimensions', () => {
    assert.equal(
      mapPortalShowCatalogDesignCardToCatalogDesign({
        id: 'design-1',
        title: 'No thumb',
        tags: [],
        width: 100,
        height: 100,
      }),
      null,
    );
    assert.equal(
      mapPortalShowCatalogDesignCardToCatalogDesign({
        id: 'design-1',
        title: 'Bad size',
        thumbnailPath: 'designs/design-1/thumb.webp',
        tags: [],
        width: 0,
        height: 100,
      }),
      null,
    );
  });
});
