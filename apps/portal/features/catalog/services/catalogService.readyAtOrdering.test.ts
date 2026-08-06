import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { getDesignSortValue } from './catalogService';
import type { CatalogDesign } from '../types/catalog.types';

function design(partial: Partial<CatalogDesign> & Pick<CatalogDesign, 'id'>): CatalogDesign {
  return {
    title: partial.title ?? partial.id,
    tags: [],
    thumbnailPath: 't',
    width: 1,
    height: 1,
    requestCount: 0,
    favoriteCount: 0,
    ...partial,
  };
}

describe('Portal catalog readyAt ordering', () => {
  const service = readFileSync(
    'apps/portal/features/catalog/services/catalogService.ts',
    'utf8',
  );
  const hook = readFileSync(
    'apps/portal/features/catalog/hooks/useCatalogDesigns.ts',
    'utf8',
  );
  const types = readFileSync(
    'apps/portal/features/catalog/types/catalog.types.ts',
    'utf8',
  );

  it('CatalogDesignSortField includes readyAt', () => {
    assert.match(types, /\| 'readyAt'/);
  });

  it('default browse resolves sortField to readyAt (not createdAt)', () => {
    assert.match(service, /return listQuery\.sortField \?\? 'readyAt'/);
    assert.match(hook, /return 'readyAt'/);
    assert.match(service, /orderBy\(sortField, 'desc'\)/);
    assert.match(service, /orderBy\('__name__', 'desc'\)/);
  });

  it('readyAt sort value prefers readyAtMs then createdAtMs', () => {
    const olderCreateNewerReady = design({
      id: 'old',
      createdAtMs: 1_000,
      readyAtMs: 9_000,
    });
    const newerCreateOlderReady = design({
      id: 'new',
      createdAtMs: 5_000,
      readyAtMs: 6_000,
    });
    assert.ok(
      getDesignSortValue(olderCreateNewerReady, 'readyAt') >
        getDesignSortValue(newerCreateOlderReady, 'readyAt'),
    );
  });

  it('metadata-only timestamps do not affect readyAt sort key', () => {
    const base = design({ id: 'a', createdAtMs: 1_000, readyAtMs: 2_000, updatedAtMs: 2_000 });
    const edited = design({
      id: 'a',
      createdAtMs: 1_000,
      readyAtMs: 2_000,
      updatedAtMs: 99_000,
      title: 'Edited',
    });
    assert.equal(getDesignSortValue(base, 'readyAt'), getDesignSortValue(edited, 'readyAt'));
  });

  it('legacy designs without readyAt fall back to createdAtMs for the readyAt key', () => {
    assert.equal(
      getDesignSortValue(design({ id: 'legacy', createdAtMs: 4_000 }), 'readyAt'),
      4_000,
    );
  });

  it('createdAt sort key uses document createdAt (Discover new window)', () => {
    assert.equal(
      getDesignSortValue(
        design({ id: 'x', createdAtMs: 1_000, readyAtMs: 9_000 }),
        'createdAt',
      ),
      1_000,
    );
  });

  it('completeness guard and index fallback remain for readyAt', () => {
    assert.match(service, /sortField === 'readyAt' && !listQuery\.cursor && !page\.hasMore/);
    assert.match(service, /matchingCount > page\.designs\.length/);
    assert.match(service, /sortField === 'readyAt'/);
    assert.match(
      service,
      /sortField: 'createdAt'/,
    );
  });

  it('does not introduce page-local sort of Firestore browse results', () => {
    assert.doesNotMatch(service, /\.sort\(\s*\(left,\s*right\)\s*=>\s*getDesignSortValue/);
  });
});
