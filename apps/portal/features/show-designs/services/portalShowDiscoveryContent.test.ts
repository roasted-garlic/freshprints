import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import type { CatalogDesign } from '../../catalog/types/catalog.types';

import {
  designsForShowHomeRailPresentation,
  loadPortalNextShowRail,
  loadPortalShowsThisWeekRail,
  type PortalShowHomeRail,
} from './portalShowDiscoveryContent';

function design(id: string): CatalogDesign {
  return {
    id,
    title: `Design ${id}`,
    requestCount: 0,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
  } as CatalogDesign;
}

function rail(partial: Partial<PortalShowHomeRail> & Pick<PortalShowHomeRail, 'key' | 'title'>): PortalShowHomeRail {
  return {
    designs: [design('a'), design('b'), design('c')],
    ...partial,
  };
}

describe('designsForShowHomeRailPresentation', () => {
  it('returns a reversed copy when reversePresentationOrder is true', () => {
    const source = rail({
      key: 'shows-this-week',
      title: 'Added to Shows This Week',
      reversePresentationOrder: true,
    });
    const originalOrder = source.designs.map((entry) => entry.id);

    const presented = designsForShowHomeRailPresentation(source);

    assert.deepEqual(
      presented.map((entry) => entry.id),
      ['c', 'b', 'a'],
    );
    assert.deepEqual(
      source.designs.map((entry) => entry.id),
      originalOrder,
      'source designs must not be mutated',
    );
    assert.notEqual(presented, source.designs);
  });

  it('returns the canonical array when reversePresentationOrder is absent or false', () => {
    const withoutFlag = rail({ key: 'show:1', title: 'Next Show' });
    assert.equal(designsForShowHomeRailPresentation(withoutFlag), withoutFlag.designs);

    const explicitFalse = rail({
      key: 'show:2',
      title: 'Next Show',
      reversePresentationOrder: false,
    });
    assert.equal(designsForShowHomeRailPresentation(explicitFalse), explicitFalse.designs);
  });
});

describe('show home rail loaders', () => {
  it('exports independent loader functions', () => {
    assert.equal(typeof loadPortalNextShowRail, 'function');
    assert.equal(typeof loadPortalShowsThisWeekRail, 'function');
    assert.notEqual(loadPortalNextShowRail, loadPortalShowsThisWeekRail);
  });

  it('buildPortalShowsThisWeekRailFromShows sets reversePresentationOrder on the rail object', async () => {
    const source = readFileSync(
      'apps/portal/features/show-designs/services/portalShowDiscoveryContent.ts',
      'utf8',
    );
    const block = source.slice(
      source.indexOf('export async function buildPortalShowsThisWeekRailFromShows'),
      source.indexOf('export async function loadPortalNextShowRail'),
    );
    assert.match(block, /reversePresentationOrder:\s*true/);
    assert.doesNotMatch(block, /designs\.reverse\(/);
  });

  it('loadCatalogShowDesigns path does not apply presentation reversal', () => {
    const source = readFileSync(
      'apps/portal/features/show-designs/services/portalShowDiscoveryContent.ts',
      'utf8',
    );
    const block = source.slice(source.indexOf('export async function loadCatalogShowDesigns'));
    assert.doesNotMatch(block, /designsForShowHomeRailPresentation/);
    assert.doesNotMatch(block, /\.reverse\(/);
  });
});
