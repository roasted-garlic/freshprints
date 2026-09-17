import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const PAGE_PATH = 'apps/portal/features/catalog/pages/CatalogHomePageContent.tsx';

function readPage(): string {
  return readFileSync(PAGE_PATH, 'utf8');
}

describe('CatalogHomePageContent show rails', () => {
  it('does not gate the Discover grid on show-rail loading', () => {
    const page = readPage();
    assert.doesNotMatch(page, /isLoading\s*\|\|\s*isShowRailsLoading/);
    assert.doesNotMatch(page, /isShowRailsLoading\s*\|\|\s*isLoading/);
    assert.doesNotMatch(page, /showRailsError/);
  });

  it('uses catalog-only loading for the main grid gate', () => {
    const page = readPage();
    assert.match(page, /\{isLoading \? \(/);
    assert.match(page, /Loading designs…/);
  });

  it('shows localized loading copy for each show rail', () => {
    const page = readPage();
    assert.match(page, /Loading Next Show designs…/);
    assert.match(page, /Loading this week's designs…/);
  });

  it('maps This Week designs through the non-mutating presentation helper', () => {
    const page = readPage();
    assert.match(page, /designsForShowHomeRailPresentation/);
    assert.doesNotMatch(page, /rail\.designs\.reverse\(/);
    assert.doesNotMatch(page, /\.designs\.reverse\(\)/);
  });

  it('loads show rails through independent hook slots', () => {
    const page = readPage();
    assert.match(page, /const \{ nextShow, thisWeek \} = usePortalShowHomeRails\(\)/);
    assert.match(page, /renderShowRailSlot\(nextShow/);
    assert.match(page, /renderShowRailSlot\(thisWeek/);
  });

  it('inserts show rails after the New discovery section', () => {
    const page = readPage();
    assert.match(page, /discoveryBeforeShow\.map/);
    assert.match(page, /renderShowRailSlot\(nextShow/);
    assert.match(page, /renderShowRailSlot\(thisWeek/);
    assert.match(page, /discoveryAfterShow\.map/);
    assert.match(page, /section\.discover === 'new'/);
  });

  it('opens both homepage show rails through the shared details path with by-ID hydration', () => {
    const page = readPage();
    assert.match(page, /CatalogDesignDetailsModal/);
    assert.match(page, /CatalogSelectionCard/);
    assert.match(page, /hydratePortalShowDesignForDetails/);
    assert.match(page, /showRailDesignIds/);
    assert.match(page, /nextShow\.rail\?\.designs/);
    assert.match(page, /thisWeek\.rail\?\.designs/);
    assert.match(page, /catalogService\.getReadyDesignsByIds/);
    assert.match(page, /openCatalogDesignDetails\(hydratedDesign\)/);
    assert.match(page, /detailHydrationRequestRef/);
    assert.match(page, /requestId !== detailHydrationRequestRef\.current/);
  });

  it('keeps the public show-card contract compact and does not add description to the callable DTO', () => {
    const dto = readFileSync(
      'packages/shared/src/types/portal/listPortalShowCatalogDesigns.types.ts',
      'utf8',
    );
    const callable = readFileSync('functions/src/lib/portalShowCatalogDesigns.ts', 'utf8');
    assert.doesNotMatch(dto, /description/);
    assert.doesNotMatch(callable, /description:/);
  });

  it('preserves the existing modal action wiring and presentation-order helper', () => {
    const page = readPage();
    assert.match(page, /onAddToRequest=/);
    assert.match(page, /onAddCompanionToRequest=/);
    assert.match(page, /onQuantityChange=/);
    assert.match(page, /onRemoveFromRequest=/);
    assert.match(page, /designsForShowHomeRailPresentation/);
    assert.doesNotMatch(page, /rail\.designs\.reverse\(/);
  });
});
