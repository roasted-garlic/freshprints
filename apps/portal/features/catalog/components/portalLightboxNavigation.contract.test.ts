import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const portalRoot = resolve(here, '../../..');

function readPortal(relativePath: string): string {
  return readFileSync(join(portalRoot, relativePath), 'utf8');
}

describe('Portal lightbox Previous/Next caller contracts', () => {
  it('Print Request detail navigates by item.id (not designId)', () => {
    const detail = readPortal('app/(app)/requests/[id]/PrintRequestDetailView.tsx');
    const card = readPortal('features/print-requests/components/PortalPrintRequestItemCard.tsx');

    assert.match(detail, /id:\s*item\.id/);
    assert.match(detail, /onOpenLightbox/);
    assert.match(detail, /data-print-request-item-id/);
    assert.match(detail, /onActiveItemChange=\{setLightboxActiveItemId\}/);
    assert.match(detail, /onCloseWithFinalItemId=\{closeItemLightbox\}/);
    assert.match(card, /data-print-request-item-id=\{item\.id\}/);
    assert.match(card, /onOpenLightbox\(item\.id\)/);
    assert.doesNotMatch(
      detail,
      /lightboxActiveItemId.*designId|activeItemId:\s*item\.designId|id:\s*item\.designId/,
    );
  });

  it('Catalog details hosts pass displayed/filtered navigationDesigns collections', () => {
    const details = readPortal('features/catalog/components/CatalogDesignDetailsModal.tsx');
    assert.match(details, /navigationDesigns\?:/);
    assert.match(details, /lightboxNavigationItems/);
    assert.match(details, /onActiveItemChange=\{handleLightboxActiveItemChange\}/);
    assert.match(details, /activeItemId=\{design\.id\}/);

    assert.match(
      readPortal('features/catalog/pages/CatalogPageContent.tsx'),
      /navigationDesigns=\{displayedDesigns\}/,
    );
    assert.match(
      readPortal('features/catalog/pages/CatalogHomePageContent.tsx'),
      /navigationDesigns=\{navigationDesigns\}/,
    );
    assert.match(
      readPortal('features/favorites/pages/FavoritesPageContent.tsx'),
      /navigationDesigns=\{designs\}/,
    );
    assert.match(
      readPortal('features/show-designs/pages/ShowDesignGalleryPageContent.tsx'),
      /navigationDesigns=\{designs\}/,
    );
    assert.match(
      readPortal('features/account/components/AccountArtworkGallery.tsx'),
      /navigationDesigns=\{reusableDesigns\}/,
    );
  });

  it('parked editing modules stay out of lightbox files', () => {
    const lightboxOnlyFiles = [
      'features/catalog/components/CatalogPreviewLightbox.tsx',
      'features/catalog/components/CatalogDesignDetailsModal.tsx',
      'features/account/components/AccountArtworkGallery.tsx',
      'features/assisted-creation/components/AssistedCreationMediaThumbs.tsx',
    ];

    for (const relativePath of lightboxOnlyFiles) {
      const source = readPortal(relativePath);
      assert.doesNotMatch(
        source,
        /PortalParkedDraftOverlay|PortalEditingModeBanner|parkCurrentDraft|parksDraftPrintRequestId|parkedByEditingRequestId/,
        `${relativePath} must not import or mutate parking/editing draft ownership`,
      );
    }

    const card = readPortal('features/print-requests/components/PortalPrintRequestItemCard.tsx');
    assert.doesNotMatch(
      card,
      /PortalParkedDraftOverlay|PortalEditingModeBanner|parkCurrentDraft|parksDraftPrintRequestId/,
    );
    assert.match(card, /onOpenLightbox/);

    const detail = readPortal('app/(app)/requests/[id]/PrintRequestDetailView.tsx');
    // Page shell may still render parked overlay — lightbox open/close must stay preview-only.
    assert.match(detail, /PortalParkedDraftOverlay/);
    assert.match(detail, /async \(itemId: string\) => \{/);
    assert.match(detail, /catalogStorageService\.getDownloadUrlForCatalogPath/);
    assert.doesNotMatch(detail, /setLightboxActiveItemId\([^)]*park/i);
    assert.doesNotMatch(
      detail.slice(detail.indexOf('openItemLightbox'), detail.indexOf('closeItemLightbox') + 400),
      /parkCurrentDraft|setSelectedWorkingRequestId|resetWorkingCart/,
    );
  });

  it('CatalogPreviewLightbox keeps arrow-key editable guard and position indicator', () => {
    const source = readPortal('features/catalog/components/CatalogPreviewLightbox.tsx');
    assert.match(source, /isPreviewLightboxEditableKeyboardTarget/);
    assert.match(source, /ArrowLeft/);
    assert.match(source, /ArrowRight/);
    assert.match(source, /design-preview-lightbox-position/);
    assert.match(source, /positionLabel/);
    assert.match(source, /aria-label="Previous image"/);
    assert.match(source, /aria-label="Next image"/);
  });

  it('Account artwork and assisted thumbs navigate within loaded sibling collections', () => {
    const gallery = readPortal('features/account/components/AccountArtworkGallery.tsx');
    assert.match(gallery, /activeItemId:\s*item\.id/);
    assert.match(gallery, /openLightbox\(item,\s*previewItems\)/);
    assert.match(gallery, /openLightbox\(item,\s*filteredPastItems\)/);
    assert.match(gallery, /onActiveItemChange/);

    const thumbs = readPortal(
      'features/assisted-creation/components/AssistedCreationMediaThumbs.tsx',
    );
    assert.match(thumbs, /navigationItems\.length > 1/);
    assert.match(thumbs, /onActiveItemChange=\{setLightboxActiveId\}/);
    assert.match(thumbs, /id:\s*item\.id/);
  });
});
