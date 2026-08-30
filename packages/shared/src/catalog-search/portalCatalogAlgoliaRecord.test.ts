import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  PORTAL_CATALOG_ALGOLIA_ATTRIBUTES_FOR_FACETING,
  PORTAL_CATALOG_ALGOLIA_RECORD_SIZE_SOFT_MAX_BYTES,
  PORTAL_CATALOG_ALGOLIA_SEARCHABLE_ATTRIBUTES,
  PORTAL_CATALOG_ALGOLIA_SMART_FACET_ATTRIBUTES,
  normalizePortalCatalogAlgoliaStringList,
  projectSmartProfileForAlgoliaIndex,
} from './portalCatalogAlgoliaRecord';

describe('portalCatalogAlgoliaRecord Slice 3 helpers', () => {
  it('orders searchableAttributes with structured fields before searchConcepts', () => {
    const attrs = [...PORTAL_CATALOG_ALGOLIA_SEARCHABLE_ATTRIBUTES];
    assert.equal(attrs[0], 'title');
    const subjectsIdx = attrs.indexOf('unordered(subjects)');
    const conceptsIdx = attrs.indexOf('unordered(searchConcepts)');
    const visibleIdx = attrs.indexOf('unordered(visibleText)');
    const objectsIdx = attrs.indexOf('unordered(objects)');
    const legacyIdx = attrs.indexOf('searchText');
    assert.ok(subjectsIdx > 0 && subjectsIdx < conceptsIdx);
    assert.ok(conceptsIdx < visibleIdx);
    assert.ok(visibleIdx < objectsIdx);
    assert.ok(objectsIdx < legacyIdx);
    assert.ok(!PORTAL_CATALOG_ALGOLIA_SMART_FACET_ATTRIBUTES.includes('objects' as never));
    // Title is a permanent core searchable field; description remains via searchText.
    assert.ok(attrs.includes('searchText'));
  });

  it('exposes categoryId as a retrievable facet attribute (not filterOnly)', () => {
    assert.ok(PORTAL_CATALOG_ALGOLIA_ATTRIBUTES_FOR_FACETING.includes('categoryId'));
    assert.ok(
      !(PORTAL_CATALOG_ALGOLIA_ATTRIBUTES_FOR_FACETING as readonly string[]).includes(
        'filterOnly(categoryId)',
      ),
    );
  });

  it('projects index-relevant Smart Profile fields and ignores provenance automation churn', () => {
    const projected = projectSmartProfileForAlgoliaIndex({
      subjects: ['cow', 'cow'],
      objects: ['bow'],
      provenance: {
        version: 'smart-profile-v1',
        automationDecision: 'shadow',
        validationWarnings: ['x'],
      },
    });
    assert.deepEqual(projected?.subjects, ['cow']);
    assert.deepEqual(projected?.objects, ['bow']);
    assert.equal(projected?.version, 'smart-profile-v1');
    assert.equal(projected?.automationDecision, undefined);

    const onlyProvenance = projectSmartProfileForAlgoliaIndex({
      provenance: { automationDecision: 'shadow', validationWarnings: ['x'] },
    });
    assert.equal(onlyProvenance, null);
  });

  it('normalizes string lists without undefined', () => {
    assert.equal(normalizePortalCatalogAlgoliaStringList(undefined), undefined);
    assert.equal(normalizePortalCatalogAlgoliaStringList([]), undefined);
    assert.deepEqual(normalizePortalCatalogAlgoliaStringList([' A ', 'a', '']), ['A']);
    assert.ok(
      PORTAL_CATALOG_ALGOLIA_RECORD_SIZE_SOFT_MAX_BYTES >= 10_000,
    );
  });
});
