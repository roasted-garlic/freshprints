import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { describe, it } from 'node:test';

function read(path: string): string {
  return readFileSync(path, 'utf8');
}

describe('Stage 4 publisher retirement containment', () => {
  it('does not export the six retired publisher Functions from index', () => {
    const index = read('functions/src/index.ts');
    for (const name of [
      'onCategorySnapshotSourceWritten',
      'onTagSnapshotSourceWritten',
      'onPortalCatalogSnapshotSourceWritten',
      'onPortalCatalogPublicationStateWritten',
      'rebuildCatalogSnapshots',
      'retryPortalCatalogPublication',
    ]) {
      assert.doesNotMatch(index, new RegExp(`\\b${name}\\b`));
    }
    assert.match(index, /syncPortalCatalogDesignToAlgolia/);
    assert.match(index, /reconcilePortalCatalogAlgoliaIndex/);
  });

  it('publisher source modules are removed', () => {
    assert.equal(existsSync('functions/src/catalogSnapshots/publishCatalogSnapshots.ts'), false);
    assert.equal(existsSync('functions/src/catalogSnapshots/snapshotBuilders.ts'), false);
    assert.equal(existsSync('functions/src/catalogSnapshots/portalPublicationRateGuard.ts'), false);
    assert.equal(existsSync('functions/src/catalogSnapshots/publicationRecovery.ts'), false);
    assert.equal(
      existsSync('functions/scripts/retry-portal-catalog-publication-prod.mjs'),
      false,
    );
  });

  it('Algolia sync uses relocated classifier outside catalogSnapshots', () => {
    const sync = read('functions/src/algolia/syncPortalCatalogDesignToAlgolia.ts');
    assert.match(sync, /from ['"]\.\/portalCatalogChangeClassifier['"]/);
    assert.doesNotMatch(sync, /catalogSnapshots/);
    assert.equal(existsSync('functions/src/algolia/portalCatalogChangeClassifier.ts'), true);
  });

  it('Portal managed search/facets do not call portalCatalogAssetService', () => {
    const hook = read('apps/portal/features/catalog/hooks/useCatalogDesigns.ts');
    const service = read('apps/portal/features/catalog/services/catalogService.ts');
    assert.doesNotMatch(hook, /portalCatalogAssetService/);
    assert.doesNotMatch(hook, /generatedPortalCatalogEnabled/);
    assert.doesNotMatch(service, /portalCatalogAssetService/);
    assert.match(hook, /Catalog search is temporarily unavailable/);
    assert.match(service, /Tag filters are temporarily unavailable/);
  });

  it('generatedPortalCatalogEnabled cannot re-enable Storage reads', () => {
    const flags = read('apps/portal/features/catalog/services/catalogSnapshotFlags.ts');
    assert.match(flags, /return false/);
    assert.doesNotMatch(flags, /NEXT_PUBLIC_USE_GENERATED_CATALOG_SNAPSHOTS/);
  });
});
