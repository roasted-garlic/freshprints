import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

const ROOT = path.resolve(process.cwd());

function read(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), 'utf8');
}

describe('CatalogRequestQuantityControls — shared extract', () => {
  const source = read('apps/portal/features/catalog/components/CatalogRequestQuantityControls.tsx');

  it('implements trash-at-1 and remove-at-0 input commit rules', () => {
    assert.match(source, /quantity <= 1 \? `Remove \$\{designTitle\}`/);
    assert.match(source, /if \(quantity <= 1\) \{\s*onRemove\(designId\);/);
    assert.match(source, /parsed === 0/);
    assert.match(source, /onRemove\(designId\)/);
  });

  it('disables increase when !canAddPrints while leave decrease enabled', () => {
    assert.match(source, /const increaseDisabled = disabled \|\| !canAddPrints/);
    assert.match(source, /disabled=\{increaseDisabled\}/);
    assert.match(source, /disabled=\{disabled\}/);
  });
});

describe('CatalogSelectionCard reuses shared quantity controls', () => {
  const source = read('apps/portal/features/catalog/components/CatalogSelectionCard.tsx');

  it('renders CatalogRequestQuantityControls when selected', () => {
    assert.match(source, /<CatalogRequestQuantityControls/);
    assert.doesNotMatch(source, /portal-request-item-stepper-button/);
  });
});

describe('CatalogDesignDetailsModal Current Request qty parity', () => {
  const modal = read('apps/portal/features/catalog/components/CatalogDesignDetailsModal.tsx');
  const library = read('apps/portal/features/catalog/pages/CatalogPageContent.tsx');
  const home = read('apps/portal/features/catalog/pages/CatalogHomePageContent.tsx');

  it('shows qty controls when in Current Request; Add when absent', () => {
    assert.match(modal, /showQuantityControls/);
    assert.match(modal, /<CatalogRequestQuantityControls/);
    assert.match(modal, /Add to request/);
    assert.match(
      modal,
      /showQuantityControls \?[\s\S]*CatalogRequestQuantityControls[\s\S]*: onAddToRequest \?/,
    );
  });

  it('accepts quantity + change/remove handlers from parents', () => {
    assert.match(modal, /currentRequestQuantity\?:/);
    assert.match(modal, /onQuantityChange\?:/);
    assert.match(modal, /onRemoveFromRequest\?:/);
  });

  it('Catalog library page wires aggregates and add-flow qty handlers into the modal', () => {
    assert.match(library, /currentRequestQuantity=\{/);
    assert.match(library, /onQuantityChange=\{/);
    assert.match(library, /onRemoveFromRequest=\{/);
    assert.match(library, /addDesignFlow\.setQuantity/);
    assert.match(library, /addDesignFlow\.removeDesign/);
    assert.match(library, /selectionMode\.setQuantity/);
  });

  it('Catalog home page wires the same Current Request handlers', () => {
    assert.match(home, /currentRequestQuantity=\{/);
    assert.match(home, /onQuantityChange=\{/);
    assert.match(home, /onRemoveFromRequest=\{/);
    assert.match(home, /addDesignFlow\.setQuantity/);
    assert.match(home, /addDesignFlow\.removeDesign/);
  });

  it('Favorites and account gallery also wire qty handlers into Details', () => {
    const favorites = read('apps/portal/features/favorites/pages/FavoritesPageContent.tsx');
    const account = read('apps/portal/features/account/components/AccountArtworkGallery.tsx');
    assert.match(favorites, /onQuantityChange=\{addDesignFlow\.setQuantity\}/);
    assert.match(favorites, /onRemoveFromRequest=\{addDesignFlow\.removeDesign\}/);
    assert.match(account, /onQuantityChange=\{addDesignFlow\.setQuantity\}/);
    assert.match(account, /onRemoveFromRequest=\{addDesignFlow\.removeDesign\}/);
  });

  it('does not introduce a second Firestore listener for modal sync', () => {
    assert.doesNotMatch(modal, /onSnapshot|getDoc|subscribe/);
  });
});

describe('ShareDesignPortalPageContent Current Request qty parity', () => {
  const share = read('apps/portal/features/catalog/pages/ShareDesignPortalPageContent.tsx');
  const sharePage = read('apps/portal/app/(app)/share/design/[id]/page.tsx');

  it('reuses CatalogRequestQuantityControls when the design is already in the Working Request', () => {
    assert.match(share, /showQuantityControls/);
    assert.match(share, /<CatalogRequestQuantityControls/);
    assert.match(share, /addDesignFlow\.setQuantity/);
    assert.match(share, /addDesignFlow\.removeDesign/);
    assert.match(share, /primaryQuantityByDesignId/);
    assert.match(share, /quantityByDesignId/);
    assert.match(
      share,
      /showQuantityControls && design \?[\s\S]*CatalogRequestQuantityControls[\s\S]*: isAuthenticated \?/,
    );
  });

  it('keeps Add to request for authenticated users when the design is not in the request', () => {
    assert.match(share, /Add to request/);
    assert.match(share, /addDesignFlow\.addDesign/);
  });

  it('keeps the guest Sign-in CTA and does not expose qty controls without auth', () => {
    assert.match(share, /Sign in to add to a request/);
    assert.match(share, /showQuantityControls = Boolean\(isAuthenticated && isInCurrentRequest && design\)/);
  });

  it('does not add a Firestore listener or extra getDoc on the share client page', () => {
    assert.doesNotMatch(share, /onSnapshot|getDoc|subscribe/);
  });

  it('leaves SSR metadata / OG generateMetadata on the share route unchanged', () => {
    assert.match(sharePage, /export async function generateMetadata/);
    assert.match(sharePage, /loadPortalDesignShareMeta/);
    assert.match(sharePage, /buildPortalDesignShareMetadata/);
    assert.match(sharePage, /dynamic = 'force-dynamic'/);
    assert.doesNotMatch(sharePage, /CatalogRequestQuantityControls/);
  });
});
