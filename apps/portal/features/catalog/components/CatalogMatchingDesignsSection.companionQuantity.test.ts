import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const source = readFileSync('apps/portal/features/catalog/components/CatalogMatchingDesignsSection.tsx', 'utf8');
const details = readFileSync('apps/portal/features/catalog/components/CatalogDesignDetailsModal.tsx', 'utf8');
const suggestion = readFileSync('apps/portal/features/catalog/components/CatalogCompanionSuggestionModal.tsx', 'utf8');
const home = readFileSync('apps/portal/features/catalog/pages/CatalogHomePageContent.tsx', 'utf8');
const library = readFileSync('apps/portal/features/catalog/pages/CatalogPageContent.tsx', 'utf8');
const catalogStyles = readFileSync('apps/portal/styles/catalog.css', 'utf8');

describe('CatalogMatchingDesignsSection — companion Add feedback and quantity controls', () => {
  it('renders a server-confirmed Added state and does not fake success from quantity alone', () => {
    assert.match(source, /actionState === 'added'/);
    assert.match(source, /aria-live="polite"[\s\S]*>\s*Added\s*</);
    assert.match(source, /actionState === 'pending'/);
    assert.match(source, /disabled\s+type="button"/);
    assert.doesNotMatch(source, /quantity > 0[\s\S]*Added/);
  });

  it('reuses the established quantity controls for existing request items', () => {
    assert.match(source, /CatalogRequestQuantityControls/);
    assert.match(source, /onQuantityChange=\{onQuantityChange\}/);
    assert.match(source, /onRemove=\{onRemove\}/);
    assert.match(source, /quantity=\{quantity\}/);
  });

  it('wires quantity and action state into both the parent details and suggestion surfaces', () => {
    assert.match(details, /companionActionStateById/);
    assert.match(details, /companionQuantities/);
    assert.match(details, /onAddCompanionToRequest/);
    assert.match(details, /onQuantityChange=\{onQuantityChange\}/);
    assert.match(details, /onRemove=\{onRemoveFromRequest\}/);
    assert.match(suggestion, /companionActionStateById/);
    assert.match(suggestion, /companionQuantities/);
    assert.match(suggestion, /onQuantityChange=\{onQuantityChange\}/);
    assert.match(suggestion, /onRemove=\{onRemove\}/);
    assert.match(home, /companionActionStateById=\{addDesignFlow\.companionActionStateById\}/);
    assert.match(library, /companionActionStateById=\{addDesignFlow\.companionActionStateById\}/);
    assert.match(home, /quantityByDesignId[\s\S]*primaryQuantityByDesignId/);
    assert.match(library, /quantityByDesignId[\s\S]*primaryQuantityByDesignId/);
  });

  it('keeps companion steppers aligned and usable at compact card widths', () => {
    assert.match(source, /design-matching-designs-qty-controls design-selection-card-qty-controls portal-request-item-stepper portal-card-input-shell/);
    assert.match(
      catalogStyles,
      /\.design-matching-designs-qty-controls\.portal-request-item-stepper\s*\{[\s\S]*grid-template-columns:\s*2\.25rem minmax\(0, 1fr\) 2\.25rem;/,
    );
    assert.match(
      catalogStyles,
      /\.design-matching-designs-qty-controls \.portal-request-item-stepper-button\s*\{[\s\S]*align-items:\s*center;[\s\S]*justify-content:\s*center;[\s\S]*line-height:\s*0;/,
    );
    assert.match(
      catalogStyles,
      /\.design-matching-designs-qty-controls \.portal-request-item-stepper-input\s*\{[\s\S]*text-align:\s*center;/,
    );
  });
});
