import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

describe('CatalogCompanionSuggestionModal', () => {
  const modal = readFileSync(
    'apps/portal/features/catalog/components/CatalogCompanionSuggestionModal.tsx',
    'utf8',
  );
  const home = readFileSync('apps/portal/features/catalog/pages/CatalogHomePageContent.tsx', 'utf8');
  const library = readFileSync('apps/portal/features/catalog/pages/CatalogPageContent.tsx', 'utf8');
  const css = readFileSync('apps/portal/styles/catalog.css', 'utf8');

  it('renders as a fixed dialog overlay, not an inline page banner', () => {
    assert.match(modal, /role="dialog"/);
    assert.match(modal, /modal-overlay modal-overlay-blur/);
    assert.match(modal, /aria-modal="true"/);
    assert.doesNotMatch(modal, /design-companion-suggestion-banner/);
  });

  it('supports dismiss via Escape, overlay click, close control, and Not now', () => {
    assert.match(modal, /Escape/);
    assert.match(modal, /onClick=\{onDismiss\}/);
    assert.match(modal, /Not now/);
    assert.match(modal, /Close matching designs/);
  });

  it('is wired from Home and Design Library add flows', () => {
    assert.match(home, /CatalogCompanionSuggestionModal/);
    assert.match(library, /CatalogCompanionSuggestionModal/);
    assert.doesNotMatch(home, /CatalogCompanionSuggestionBanner/);
    assert.doesNotMatch(library, /CatalogCompanionSuggestionBanner/);
  });

  it('dismisses itself before opening Design Details from a companion card', () => {
    assert.match(
      modal,
      /function handleOpenDetails[\s\S]*?onDismiss\(\);[\s\S]*?onOpenDetails\?\.\(design\)/,
    );
    assert.match(modal, /requestAnimationFrame/);
    assert.match(modal, /onOpenDetails=\{onOpenDetails \? handleOpenDetails : undefined\}/);
  });
});
