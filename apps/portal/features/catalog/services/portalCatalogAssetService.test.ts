import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { portalCatalogAssetService } from './portalCatalogAssetService';

describe('portalCatalogAssetService Stage 4 retirement stub', () => {
  it('listMatchingDesigns fails closed (no generated Storage fetch)', async () => {
    await assert.rejects(
      () => portalCatalogAssetService.listMatchingDesigns(),
      /Stage 4/,
    );
  });

  it('listTagFacets fails closed', async () => {
    await assert.rejects(() => portalCatalogAssetService.listTagFacets(), /Stage 4/);
  });

  it('listNarrowedTagFacets fails closed', async () => {
    await assert.rejects(() => portalCatalogAssetService.listNarrowedTagFacets(), /Stage 4/);
  });
});
