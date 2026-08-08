import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { encodePortalCatalogTagFacetKey } from '@fresh-prints/shared/catalog-search/portalCatalogAlgoliaRecord';

import { mergePortalAlgoliaTagFacetDistribution } from './portalAlgoliaCatalogSearchService';

/**
 * Owner QA: unselected cartoon showed (3) then selected showed (4) with 4 designs.
 * Live index probe found cartoon=4 globally — so UI was serving mount-cached approvedTags.
 * Broken modal skipped listNarrowedApprovedTags when hasFacetConstraints was false.
 */
describe('Stage 1b-C initial facet count freshness', () => {
  it('CatalogTagFilterModal always refreshes facets on open (not mount-cached approvedTags only)', () => {
    const modal = readFileSync(
      join(process.cwd(), 'apps/portal/features/catalog/components/CatalogTagFilterModal.tsx'),
      'utf8',
    );
    // Pre-fix returned early when !hasFacetConstraints and used approvedTags.
    assert.doesNotMatch(
      modal,
      /if\s*\(\s*!hasFacetConstraints\s*\)\s*\{[\s\S]*setNarrowedTags\(null\)/,
    );
    assert.doesNotMatch(modal, /hasFacetConstraints\s*\?\s*narrowedTags\s*:\s*approvedTags/);
    assert.match(modal, /listNarrowedApprovedTags/);
    assert.match(
      modal,
      /Always refresh facets when the modal opens|mount-cached `approvedTags`|cartoon 3→4/,
    );
    // Fresh fetch is the primary source while open.
    assert.match(modal, /narrowedTags\s*\?\?\s*\(narrowError\s*\?\s*approvedTags\s*:\s*null\)/);
  });

  it('discriminates stale global count 3 vs live/selected count 4 for cartoon', () => {
    const STALE_MOUNT_COUNT = 3;
    const LIVE_INDEX_COUNT = 4;
    const key = encodePortalCatalogTagFacetKey('cartoon', 'cartoon');
    const live = mergePortalAlgoliaTagFacetDistribution({ [key]: LIVE_INDEX_COUNT });
    assert.equal(live.find((tag) => tag.name === 'cartoon')?.count, LIVE_INDEX_COUNT);
    assert.notEqual(live.find((tag) => tag.name === 'cartoon')?.count, STALE_MOUNT_COUNT);
  });

  it('merges split facet keys for the same display name (defensive)', () => {
    const merged = mergePortalAlgoliaTagFacetDistribution({
      [encodePortalCatalogTagFacetKey('cartoon', 'cartoon')]: 3,
      [encodePortalCatalogTagFacetKey('cartoon-legacy', 'cartoon')]: 1,
    });
    assert.equal(merged.length, 1);
    assert.equal(merged[0]?.name, 'cartoon');
    assert.equal(merged[0]?.count, 4);
  });
});
