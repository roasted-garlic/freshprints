import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { FirebaseError } from 'firebase/app';

import {
  HOME_DISCOVERY_POOL_PAGE_SIZE,
  isFirestoreIndexNotReadyError,
  isHomeDiscoveryPoolIncompleteRelativeToReadyMembership,
  mergeHomeDiscoveryPoolById,
  shouldFillHomeDiscoveryPoolFromBaseReady,
} from './catalogService';
import type { CatalogDesign } from '../types/catalog.types';
import {
  rankMostLiked,
  rankNewThisWeek,
  rankPopular,
  rankRecentlyRequested,
} from '@fresh-prints/shared/utils/catalogDiscoveryRanking';

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

function manyReady(count: number, prefix = 'ready'): CatalogDesign[] {
  return Array.from({ length: count }, (_, index) =>
    design({
      id: `${prefix}-${index + 1}`,
      createdAtMs: 1_000_000 - index,
      requestCount: 0,
      favoriteCount: 0,
    }),
  );
}

describe('Home discovery pool fallback (prod population regression)', () => {
  const serviceSource = readFileSync(
    'apps/portal/features/catalog/services/catalogService.ts',
    'utf8',
  );

  it('CASE 1 — exact production shape: one metric hit must not suppress createdAt fill', () => {
    const metricOnly = design({
      id: 'metric-only',
      requestCount: 12,
      favoriteCount: 4,
      lastAddedToShowAtMs: 9_000,
      createdAtMs: 500,
    });
    const readyMembershipCount = 46;
    const preferredPoolSize = 1;
    const readyAtIndexUnavailable = true;

    assert.equal(
      shouldFillHomeDiscoveryPoolFromBaseReady({
        preferredPoolSize,
        readyMembershipCount,
        readyAtIndexUnavailable,
      }),
      true,
      'production shape must require base fill',
    );

    // Metric design is one of the ready membership (prod: 1 of 46 has metrics).
    const baseReady = [
      design({ id: 'metric-only', requestCount: 0, createdAtMs: 500 }),
      ...manyReady(readyMembershipCount - 1),
    ];
    const merged = mergeHomeDiscoveryPoolById([metricOnly], baseReady);

    assert.ok(merged.length > 1, 'must not stop at one design');
    assert.equal(merged.length, readyMembershipCount);
    assert.ok(merged.some((item) => item.id === 'metric-only'));
    assert.equal(
      merged.find((item) => item.id === 'metric-only')?.requestCount,
      12,
      'metric row must win on overlap',
    );
  });

  it('CASE 2 — zero metric results: membership incompleteness still fills', () => {
    assert.equal(
      shouldFillHomeDiscoveryPoolFromBaseReady({
        preferredPoolSize: 0,
        readyMembershipCount: 46,
        readyAtIndexUnavailable: true,
      }),
      true,
    );

    const merged = mergeHomeDiscoveryPoolById([], manyReady(46));
    assert.equal(merged.length, 46);
  });

  it('CASE 3 — healthy readyAt complete pool: do not force createdAt replacement', () => {
    const readyMembershipCount = 46;
    const preferred = manyReady(readyMembershipCount, 'preferred');

    assert.equal(
      shouldFillHomeDiscoveryPoolFromBaseReady({
        preferredPoolSize: preferred.length,
        readyMembershipCount,
        readyAtIndexUnavailable: false,
      }),
      false,
    );

    assert.equal(
      isHomeDiscoveryPoolIncompleteRelativeToReadyMembership(
        HOME_DISCOVERY_POOL_PAGE_SIZE,
        200,
      ),
      false,
      'full home page is sufficient vs membership',
    );
  });

  it('CASE 4 — metric ranking semantics preserved after base fill merge', () => {
    const popular = design({
      id: 'popular',
      requestCount: 20,
      favoriteCount: 1,
      createdAtMs: 100,
    });
    const liked = design({
      id: 'liked',
      requestCount: 1,
      favoriteCount: 15,
      createdAtMs: 200,
    });
    const recent = design({
      id: 'recent',
      requestCount: 0,
      favoriteCount: 0,
      lastAddedToShowAtMs: 50_000,
      createdAtMs: 300,
    });
    const newlyReady = design({
      id: 'new',
      requestCount: 0,
      favoriteCount: 0,
      readyAtMs: Date.now() - 60_000,
      createdAtMs: 10,
    });

    const merged = mergeHomeDiscoveryPoolById(
      [popular, liked, recent, newlyReady],
      manyReady(10, 'base'),
    );

    assert.deepEqual(
      rankPopular(merged).slice(0, 1).map((item) => item.id),
      ['popular'],
    );
    assert.deepEqual(
      rankMostLiked(merged).slice(0, 1).map((item) => item.id),
      ['liked'],
    );
    assert.deepEqual(
      rankRecentlyRequested(merged).slice(0, 1).map((item) => item.id),
      ['recent'],
    );
    assert.ok(rankNewThisWeek(merged).some((item) => item.id === 'new'));
  });

  it('CASE 5 — dedupe: overlapping metric + base designs appear once', () => {
    const shared = design({ id: 'shared', requestCount: 7, createdAtMs: 1 });
    const baseCopy = design({ id: 'shared', requestCount: 0, createdAtMs: 1 });
    const other = design({ id: 'other', createdAtMs: 2 });

    const merged = mergeHomeDiscoveryPoolById([shared], [baseCopy, other]);
    assert.equal(merged.length, 2);
    assert.equal(merged.filter((item) => item.id === 'shared').length, 1);
    assert.equal(merged.find((item) => item.id === 'shared')?.requestCount, 7);
  });

  it('CASE 6 — ready-only: Home fill paths stay on listReadyDesignsPage (status==ready mapper)', () => {
    assert.match(serviceSource, /async listHomeDiscoveryPool/);
    assert.match(
      serviceSource,
      /fillHomeDiscoveryPoolFromBaseReady[\s\S]*listReadyDesignsPageWithSortFallback/,
    );
    assert.match(
      serviceSource,
      /fillHomeDiscoveryPoolFromBaseReady[\s\S]*sortField: 'createdAt'/,
    );
    assert.match(serviceSource, /data\.status !== 'ready'/);
    assert.doesNotMatch(
      serviceSource,
      /listHomeDiscoveryPool[\s\S]{0,2500}listDiscoverDesigns/,
    );
    assert.doesNotMatch(
      serviceSource,
      /listHomeDiscoveryPool[\s\S]{0,2500}algolia/i,
    );
  });

  it('CASE 7 — genuine non-index Firestore failures are not classified as index-blocked', () => {
    const indexError = new FirebaseError(
      'failed-precondition',
      'The query requires an index. You can create it here: https://example',
    );
    const permissionError = new FirebaseError('permission-denied', 'Missing or insufficient permissions.');
    const otherFailedPrecondition = new FirebaseError('failed-precondition', 'Something else failed');

    assert.equal(isFirestoreIndexNotReadyError(indexError), true);
    assert.equal(isFirestoreIndexNotReadyError(permissionError), false);
    assert.equal(isFirestoreIndexNotReadyError(otherFailedPrecondition), false);
    assert.equal(isFirestoreIndexNotReadyError(new Error('index')), false);

    assert.match(
      serviceSource,
      /hardFailures[\s\S]{0,400}throw hardFailures\[0\]\.reason/,
    );
    assert.doesNotMatch(
      serviceSource,
      /if \(byId\.size > 0\) \{\s*return \[\.\.\.byId\.values\(\)\];\s*\}/,
    );
  });

  it('approved sufficiency rule uses ready membership, not magic 8/12/20 thresholds', () => {
    assert.equal(
      isHomeDiscoveryPoolIncompleteRelativeToReadyMembership(1, 46),
      true,
    );
    assert.equal(
      isHomeDiscoveryPoolIncompleteRelativeToReadyMembership(46, 46),
      false,
    );
    assert.equal(
      isHomeDiscoveryPoolIncompleteRelativeToReadyMembership(80, 200),
      false,
    );
    assert.doesNotMatch(serviceSource, /preferredPoolSize\s*[<>=]+\s*(8|12|20)\b/);
    assert.match(serviceSource, /incomplete relative to ready membership/i);
  });
});
