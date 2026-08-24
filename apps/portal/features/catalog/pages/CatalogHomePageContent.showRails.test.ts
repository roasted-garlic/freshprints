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
});
