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
    assert.deepEqual(Object.keys(record!).sort(), [...PORTAL_CATALOG_ALGOLIA_ALLOWED_FIELDS].sort());
    assert.equal('aiReviewNotes' in record!, false);
    assert.equal('staffNotes' in record!, false);
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
