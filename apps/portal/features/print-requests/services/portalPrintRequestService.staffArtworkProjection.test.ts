import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Timestamp } from 'firebase/firestore';
import { readFileSync } from 'node:fs';

import { mapPrintRequestItem } from './portalPrintRequestService';

const createdAt = Timestamp.fromMillis(1_700_000_000_000);
const updatedAt = Timestamp.fromMillis(1_700_000_001_000);

describe('mapPrintRequestItem Staff Artwork projection', () => {
  it('keeps projection-preferred canonical fallback bounded and indirect', () => {
    const source = readFileSync(new URL('./portalPrintRequestService.ts', import.meta.url), 'utf8');
    assert.match(source, /mergeProjectionPreferredPrintRequestItems/);
    assert.match(source, /limit\(PORTAL_CANONICAL_FALLBACK_LIMIT\)/);
    assert.match(source, /getDoc\(doc\(getPortalDb\(\), ['"]printRequestItems['"], trimmed\)\)/);
    assert.match(source, /updatePrintRequestItem\.canonicalFallback/);
    assert.doesNotMatch(source, /collection\(getPortalDb\(\), ['"]staffArtworks['"]\)/);
  });

  it('maps Staff Artwork without designId and keeps approved customer-visible fields', () => {
    const item = mapPrintRequestItem('request-item-1', {
      printRequestId: 'request-1',
      sourceType: 'staff_artwork',
      sourceLabel: 'Staff-added',
      staffArtworkId: 'sa-1',
      titleSnapshot: 'Cucumber Life',
      previewStoragePath: 'staff-artwork/sa-1/preview.webp',
      thumbnailStoragePath: 'staff-artwork/sa-1/thumbnail.webp',
      widthPx: 4290,
      heightPx: 4140,
      artworkBackgroundHex: '#101010',
      description: 'Private description',
      notes: 'Private note',
      artworkEnhanceMode: 'enhanced',
      customerId: 'private-customer-id',
      productionStoragePath: 'staff-artwork/sa-1/production.png',
      quantity: 2,
      printWidthInches: 10.5,
      printHeightInches: 9.03,
      sizeLabel: '10.50 x 9.03 in',
      sortOrder: 7,
      status: 'pending',
      addedBy: 'studio-user',
      createdAt,
      updatedAt,
    });

    assert.equal(item.sourceType, 'staff_artwork');
    assert.equal(item.sourceLabel, 'Staff-added');
    assert.equal(item.staffArtworkId, 'sa-1');
    assert.equal(item.titleSnapshot, 'Cucumber Life');
    assert.equal(item.previewStoragePath, 'staff-artwork/sa-1/preview.webp');
    assert.equal(item.thumbnailStoragePath, 'staff-artwork/sa-1/thumbnail.webp');
    assert.equal(item.widthPx, 4290);
    assert.equal(item.heightPx, 4140);
    assert.equal(item.artworkBackgroundHex, '#101010');
    assert.equal(item.designId, undefined);
    assert.equal(item.notes, undefined);
    assert.equal('description' in item, false);
    assert.equal('customerId' in item, false);
    assert.equal('productionStoragePath' in item, false);
    assert.equal(item.artworkEnhanceMode, undefined);
  });

  it('still requires catalog identity for catalog items', () => {
    assert.throws(
      () =>
        mapPrintRequestItem('catalog-item-1', {
          printRequestId: 'request-1',
          sourceType: 'catalog_design',
          quantity: 1,
          status: 'pending',
          addedBy: 'portal-user',
          createdAt,
          updatedAt,
        }),
      /Print request item data is incomplete/,
    );
  });

  it('still requires customer upload identity for upload items', () => {
    assert.throws(
      () =>
        mapPrintRequestItem('upload-item-1', {
          printRequestId: 'request-1',
          sourceType: 'customer_upload',
          quantity: 1,
          status: 'pending',
          addedBy: 'portal-user',
          createdAt,
          updatedAt,
        }),
      /Print request item data is incomplete/,
    );
  });
});
