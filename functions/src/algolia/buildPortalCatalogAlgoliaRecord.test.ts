import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildPortalCatalogAlgoliaRecord,
  PORTAL_CATALOG_ALGOLIA_ALLOWED_FIELDS,
} from './buildPortalCatalogAlgoliaRecord';

describe('buildPortalCatalogAlgoliaRecord', () => {
  const categoriesById = new Map([['cat-1', { id: 'cat-1', name: 'Animals' }]]);

  it('returns null for non-ready designs', () => {
    assert.equal(
      buildPortalCatalogAlgoliaRecord({
        designId: 'd1',
        data: { status: 'imported', title: 'Nope' },
        categoriesById,
      }),
      null,
    );
  });

  it('builds public-safe searchable record with category copy and readyAtMs', () => {
    const record = buildPortalCatalogAlgoliaRecord({
      designId: 'd1',
      data: {
        status: 'ready',
        title: 'Cool Cat',
        description: 'A design',
        categoryId: 'cat-1',
        readyAt: { toMillis: () => 1_700_000_000_000 },
        aiReviewNotes: 'SECRET',
        staffNotes: 'SECRET',
      },
      categoriesById,
    });

    assert.ok(record);
    assert.equal(record!.objectID, 'd1');
    assert.equal(record!.title, 'Cool Cat');
    assert.match(record!.searchText, /Cool Cat/);
    assert.match(record!.searchText, /Animals/);
    assert.doesNotMatch(record!.searchText, /kitty|feline|Cat Dog/);
    assert.equal('tagIds' in record!, false);
    assert.equal('tagFacetKeys' in record!, false);
    assert.equal(record!.readyAtMs, 1_700_000_000_000);
    for (const key of Object.keys(record!)) {
      assert.ok(
        (PORTAL_CATALOG_ALGOLIA_ALLOWED_FIELDS as readonly string[]).includes(key),
        `unexpected Algolia field: ${key}`,
      );
    }
    assert.equal('aiReviewNotes' in record!, false);
    assert.equal('staffNotes' in record!, false);
    assert.equal(record!.subjects, undefined);
  });

  it('maps Smart Profile search/facet fields and omits empty dimensions', () => {
    const record = buildPortalCatalogAlgoliaRecord({
      designId: 'd-sp',
      data: {
        status: 'ready',
        title: 'Highland Cow With Bow',
        categoryId: 'cat-1',
        readyAt: { toMillis: () => 2 },
        smartProfile: {
          subjects: ['cow', 'Highland Cow', 'cow'],
          objects: ['bow'],
          styles: ['cartoon'],
          themes: ['cute'],
          interests: [],
          searchConcepts: ['Scottish cow', 'fluffy cow'],
          visibleText: ['  '],
          provenance: {
            version: 'smart-profile-v1',
            automationDecision: 'shadow',
            validationWarnings: ['ignore-me-for-index'],
          },
        },
      },
      categoriesById,
    });

    assert.ok(record);
    assert.deepEqual(record!.subjects, ['cow', 'Highland Cow']);
    assert.deepEqual(record!.objects, ['bow']);
    assert.deepEqual(record!.styles, ['cartoon']);
    assert.deepEqual(record!.searchConcepts, ['Scottish cow', 'fluffy cow']);
    assert.equal(record!.interests, undefined);
    assert.equal(record!.visibleText, undefined);
    assert.equal(record!.smartProfileVersion, 'smart-profile-v1');
    assert.equal('automationDecision' in record!, false);
    assert.ok(
      Buffer.byteLength(JSON.stringify(record!), 'utf8') < 10_000,
      'record exceeds soft Algolia size budget',
    );
  });

  it('keeps ready designs with no Smart Profile searchable by existing copy', () => {
    const record = buildPortalCatalogAlgoliaRecord({
      designId: 'd-legacy',
      data: {
        status: 'ready',
        title: 'Legacy Only',
        description: 'No smart profile',
        categoryId: 'cat-1',
        readyAt: { toMillis: () => 3 },
      },
      categoriesById,
    });

    assert.ok(record);
    assert.match(record!.searchText, /Legacy Only/);
    assert.match(record!.searchText, /No smart profile/);
    assert.equal(record!.subjects, undefined);
    assert.equal(record!.searchConcepts, undefined);
  });
});
