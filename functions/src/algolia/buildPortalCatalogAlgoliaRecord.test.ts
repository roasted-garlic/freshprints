import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildPortalCatalogAlgoliaRecord,
  indexPortalCatalogTaxonomyTag,
  PORTAL_CATALOG_ALGOLIA_ALLOWED_FIELDS,
} from './buildPortalCatalogAlgoliaRecord';

describe('buildPortalCatalogAlgoliaRecord', () => {
  const tagsById = new Map([
    [
      'tag-cat',
      { id: 'tag-cat', name: 'Cat', aliases: ['kitty', 'feline'], status: 'approved' },
    ],
    ['tag-dog', { id: 'tag-dog', name: 'Dog', aliases: [], status: 'approved' }],
  ]);
  const categoriesById = new Map([['cat-1', { id: 'cat-1', name: 'Animals' }]]);

  it('returns null for non-ready designs', () => {
    assert.equal(
      buildPortalCatalogAlgoliaRecord({
        designId: 'd1',
        data: { status: 'imported', title: 'Nope' },
        tagsById,
        categoriesById,
      }),
      null,
    );
  });

  it('builds public-safe searchable record with aliases and readyAtMs', () => {
    const record = buildPortalCatalogAlgoliaRecord({
      designId: 'd1',
      data: {
        status: 'ready',
        title: 'Cool Cat',
        description: 'A design',
        categoryId: 'cat-1',
        tags: ['tag-cat', 'tag-dog'],
        readyAt: { toMillis: () => 1_700_000_000_000 },
        aiReviewNotes: 'SECRET',
        staffNotes: 'SECRET',
      },
      tagsById,
      categoriesById,
    });

    assert.ok(record);
    assert.equal(record!.objectID, 'd1');
    assert.equal(record!.title, 'Cool Cat');
    assert.match(record!.searchText, /Cool Cat/);
    assert.match(record!.searchText, /kitty/);
    assert.match(record!.searchText, /Animals/);
    assert.deepEqual(record!.tagIds, ['tag-cat', 'tag-dog']);
    assert.ok(record!.tagFacetKeys.includes('tag-cat::Cat'));
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
        tags: ['tag-cat'],
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
      tagsById,
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

  it('keeps legacy-only ready designs searchable without Smart Profile', () => {
    const record = buildPortalCatalogAlgoliaRecord({
      designId: 'd-legacy',
      data: {
        status: 'ready',
        title: 'Legacy Only',
        description: 'No smart profile',
        categoryId: 'cat-1',
        tags: ['tag-dog'],
        readyAt: { toMillis: () => 3 },
      },
      tagsById,
      categoriesById,
    });

    assert.ok(record);
    assert.match(record!.searchText, /Legacy Only/);
    assert.match(record!.searchText, /Dog/);
    assert.equal(record!.subjects, undefined);
    assert.equal(record!.searchConcepts, undefined);
  });

  it('resolves multi-word design.tags names via taxonomy name key (not only slug id)', () => {
    const multiWordTags = new Map<
      string,
      { id: string; name: string; aliases: string[]; status?: string }
    >();
    indexPortalCatalogTaxonomyTag(multiWordTags, {
      id: 'mama-bear',
      name: 'mama bear',
      aliases: ['momma bear'],
      status: 'approved',
    });

    const record = buildPortalCatalogAlgoliaRecord({
      designId: 'd2',
      data: {
        status: 'ready',
        title: 'Mama',
        tags: ['mama bear'],
        readyAt: { toMillis: () => 1 },
      },
      tagsById: multiWordTags,
      categoriesById,
    });

    assert.ok(record);
    assert.deepEqual(record!.tagIds, ['mama bear']);
    assert.ok(record!.tagFacetKeys.includes('mama-bear::mama bear'));
    assert.match(record!.searchText, /momma bear/);
  });
});
