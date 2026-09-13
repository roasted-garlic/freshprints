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

});
