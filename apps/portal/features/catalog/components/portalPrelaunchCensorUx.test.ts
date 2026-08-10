import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

function read(path: string): string {
  return readFileSync(path, 'utf8');
}

const THUMBNAIL_PANEL_PATH = 'apps/portal/features/catalog/components/CatalogThumbnailPanel.tsx';
const LIGHTBOX_PATH = 'apps/portal/features/catalog/components/CatalogPreviewLightbox.tsx';
const DESIGN_CARD_PATH = 'apps/portal/features/catalog/components/CatalogDesignCard.tsx';
const SELECTION_CARD_PATH = 'apps/portal/features/catalog/components/CatalogSelectionCard.tsx';
const MATCHING_SECTION_PATH = 'apps/portal/features/catalog/components/CatalogMatchingDesignsSection.tsx';
const DETAILS_MODAL_PATH = 'apps/portal/features/catalog/components/CatalogDesignDetailsModal.tsx';
const SHARE_PAGE_PATH = 'apps/portal/features/catalog/pages/ShareDesignPortalPageContent.tsx';
const FILTER_BAR_PATH = 'apps/portal/features/catalog/components/CatalogFilterBar.tsx';
const CATALOG_CSS_PATH = 'apps/portal/styles/catalog.css';

function extractJsxTag(source: string, openTag: string): string {
  const start = source.indexOf(openTag);
  assert.notEqual(start, -1, `expected to find ${openTag}`);
  const end = source.indexOf('/>', start);
  assert.notEqual(end, -1, `expected a self-closing ${openTag} tag`);
  return source.slice(start, end);
}

describe('CatalogThumbnailPanel — revealMode gates reveal, not visibility (owner #1, #2, #3)', () => {
  const source = read(THUMBNAIL_PANEL_PATH);

  it('defaults revealMode to "none" (list-safe by default)', () => {
    assert.match(source, /revealMode = 'none'/);
  });

  it('"none" mode with onImageClick uses an actionable "Click to view" overlay that never reveals', () => {
    assert.match(source, /canViewFromCensorOverlay/);
    assert.match(source, /design-thumbnail-panel-censor-overlay--view/);
    assert.match(source, /handleViewFromCensorClick/);
    assert.match(source, /Click to view/);
    assert.match(source, /function handleViewFromCensorClick[\s\S]{0,200}handleImageClick\(\)/);
  });

  it('list censored overlay --view receives pointer events; --static passes through to parent card buttons', () => {
    const css = read(CATALOG_CSS_PATH);
    assert.match(css, /\.design-thumbnail-panel-censor-overlay--view[\s\S]{0,80}pointer-events:\s*auto/);
    assert.match(css, /\.design-thumbnail-panel-censor-overlay--static[\s\S]{0,80}pointer-events:\s*none/);
  });

  it('"session" mode censored overlay is the only branch offering "Click to reveal"', () => {
    const sessionBranchStart = source.indexOf('isRevealGated ? (');
    const sessionBranchEnd = source.indexOf('</div>', sessionBranchStart);
    const sessionBranch = source.slice(sessionBranchStart, sessionBranchEnd);
    assert.match(sessionBranch, /Click to reveal/);
    assert.match(sessionBranch, /onClick=\{handleRevealClick\}/);
    assert.match(sessionBranch, /onKeyDown=\{handleRevealKeyDown\}/);

    // The reveal handlers (defined once, outside the JSX branch) are what actually call
    // the caller's onReveal — confirm both do, so "Click to reveal" always reaches it.
    assert.match(source, /function handleRevealClick[\s\S]{0,200}onReveal\?\.\(\)/);
    assert.match(source, /function handleRevealKeyDown[\s\S]{0,200}onReveal\?\.\(\)/);
  });

  it('a censored thumbnail in "none" mode stays clickable for its normal action (never gated behind reveal)', () => {
    assert.match(
      source,
      /isImageInteractive =\s*\n\s*interactive &&\s*\n\s*Boolean\(onImageClick\) &&\s*\n\s*hasResolvedUrl &&\s*\n\s*Boolean\(url\) &&\s*\n\s*!\(isRevealGated && isCensored\)/,
    );
  });

  it('isCensored only accounts for sessionRevealed when revealMode is "session"', () => {
    assert.match(
      source,
      /isCensored = isExplicitContent && !showExplicitContent && !\(isRevealGated && sessionRevealed\)/,
    );
  });

  it('does not keep a residual "Censored Content" badge after reveal (covers artwork)', () => {
    assert.doesNotMatch(source, /showCensoredIndicator/);
    assert.doesNotMatch(source, /design-thumbnail-panel-censored-indicator/);
  });
});

describe('Catalog list-style surfaces opt into revealMode="none" (owner #1)', () => {
  it('CatalogDesignCard thumbnail is revealMode="none"', () => {
    const source = read(DESIGN_CARD_PATH);
    const tag = extractJsxTag(source, '<CatalogThumbnailPanel');
    assert.match(tag, /revealMode="none"/);
  });

  it('CatalogSelectionCard thumbnail is revealMode="none" and still opens Details on click', () => {
    const source = read(SELECTION_CARD_PATH);
    const tag = extractJsxTag(source, '<CatalogThumbnailPanel');
    assert.match(tag, /revealMode="none"/);
    assert.match(tag, /onImageClick=\{\(\) => onOpenDetails\(design\)\}/);
  });

  it('CatalogDesignCard wires onImageClick so Click to view opens Details', () => {
    const source = read(DESIGN_CARD_PATH);
    const tag = extractJsxTag(source, '<CatalogThumbnailPanel');
    assert.match(tag, /revealMode="none"/);
    assert.match(tag, /onImageClick=\{\(\) => onSelect\(design\)\}/);
    assert.match(tag, /interactive/);
  });

  it('CatalogMatchingDesignsSection thumbnails are revealMode="none"', () => {
    const source = read(MATCHING_SECTION_PATH);
    const tag = extractJsxTag(source, '<CatalogThumbnailPanel');
    assert.match(tag, /revealMode="none"/);
  });
});

describe('CatalogDesignDetailsModal is the sole reveal gate, shared with its lightbox (owner #2, #3)', () => {
  const source = read(DETAILS_MODAL_PATH);

  it('lifts a single sessionRevealed state for the open design', () => {
    assert.match(source, /const \[sessionRevealed, setSessionRevealed\] = useState\(false\)/);
  });

  it('resets sessionRevealed whenever the modal closes or a different design opens', () => {
    const depsIndex = source.indexOf('[isOpen, design?.id, design?.artworkBackgroundHex]');
    assert.notEqual(depsIndex, -1);
    const effectStart = source.lastIndexOf('useEffect(() => {', depsIndex);
    const effectBlock = source.slice(effectStart, depsIndex);
    const resetCount = effectBlock.split('setSessionRevealed(false)').length - 1;
    assert.ok(resetCount >= 2, 'expected sessionRevealed to reset on both the close branch and the open/design-change branch');
  });

  it('hero thumbnail uses revealMode="session" wired to the lifted state', () => {
    const tag = extractJsxTag(source, '<CatalogThumbnailPanel');
    assert.match(tag, /revealMode="session"/);
    assert.match(tag, /sessionRevealed=\{sessionRevealed\}/);
    assert.match(tag, /onReveal=\{\(\) => setSessionRevealed\(true\)\}/);
  });

  it('the paired lightbox receives the same sessionRevealed state — no second reveal gate', () => {
    const tag = extractJsxTag(source, '<CatalogPreviewLightbox');
    assert.match(tag, /sessionRevealed=\{sessionRevealed\}/);
    assert.match(tag, /onReveal=\{\(\) => setSessionRevealed\(true\)\}/);
  });

  it('passes sessionRevealed into text masking so Click to reveal unmasks title/description', () => {
    assert.match(
      source,
      /usePortalCensoredDesignText\(\s*design \?\? \{ title: '', description: '', isExplicitContent: false \},\s*\{ sessionRevealed \},\s*\)/,
    );
  });
});

describe('ShareDesignPortalPageContent mirrors the Design Details single reveal gate (owner #2, #3)', () => {
  const source = read(SHARE_PAGE_PATH);

  it('lifts sessionRevealed and resets it whenever the shared design changes', () => {
    assert.match(source, /const \[sessionRevealed, setSessionRevealed\] = useState\(false\)/);
    const depsIndex = source.indexOf('}, [designId]);');
    assert.notEqual(depsIndex, -1);
    const effectStart = source.lastIndexOf('useEffect(() => {', depsIndex);
    const effectBlock = source.slice(effectStart, depsIndex);
    assert.match(effectBlock, /let cancelled = false;\s*\n\s*setSessionRevealed\(false\)/);
  });

  it('hero + lightbox share revealMode="session" and the same sessionRevealed/onReveal wiring', () => {
    const heroTag = extractJsxTag(source, '<CatalogThumbnailPanel');
    assert.match(heroTag, /revealMode="session"/);
    assert.match(heroTag, /sessionRevealed=\{sessionRevealed\}/);

    const lightboxTag = extractJsxTag(source, '<CatalogPreviewLightbox');
    assert.match(lightboxTag, /sessionRevealed=\{sessionRevealed\}/);
    assert.match(lightboxTag, /onReveal=\{\(\) => setSessionRevealed\(true\)\}/);
  });

  it('passes sessionRevealed into text masking so Click to reveal unmasks title/description', () => {
    assert.match(source, /usePortalCensoredDesignText\([\s\S]*?\{ sessionRevealed \}/);
  });
});

describe('CatalogPreviewLightbox — inherits reveal, never asks a second time (owner #3)', () => {
  const source = read(LIGHTBOX_PATH);

  it('accepts sessionRevealed / onReveal instead of owning its own reveal state', () => {
    assert.match(source, /sessionRevealed\?: boolean/);
    assert.match(source, /onReveal\?: \(\) => void/);
    assert.doesNotMatch(source, /useState/);
  });

  it('does not keep a residual badge after reveal; static overlay remains only as a defensive fallback while still censored', () => {
    assert.doesNotMatch(source, /design-preview-lightbox-censored-indicator/);
    assert.doesNotMatch(source, /showCensoredIndicator/);
    assert.match(source, /design-thumbnail-panel-censor-overlay--static/);
  });
});

describe('CatalogFilterBar toggle label (owner #6 — Censored / Uncensored state label amendment)', () => {
  const source = read(FILTER_BAR_PATH);

  it('visible label toggles "Censored" (off) / "Uncensored" (on) by preference state', () => {
    assert.match(source, /\{showExplicitContent \? 'Uncensored' : 'Censored'\}/);
    // Never a static "Censored"-only or "Show censored content" visible label.
    assert.doesNotMatch(source, />\s*Censored\s*</);
    assert.doesNotMatch(source, />\s*Show censored content\s*</);
  });

  it('accessible name / tooltip stay state-aware ("Show" off / "Hide" on)', () => {
    assert.match(
      source,
      /aria-label=\{showExplicitContent \? 'Hide censored content' : 'Show censored content'\}/,
    );
    assert.match(
      source,
      /title=\{showExplicitContent \? 'Hide censored content' : 'Show censored content'\}/,
    );
  });

  it('does not change the storage-backed preference wiring', () => {
    assert.match(source, /useExplicitContentPreference/);
    assert.match(source, /setShowExplicitContent\(event\.target\.checked\)/);
  });
});

describe('Mobile filter layout — balanced 2x2 grid, no 3-track/4-child overflow (owner #7)', () => {
  const css = read(CATALOG_CSS_PATH);

  it('secondary filter controls use two equal tracks at the mobile breakpoint', () => {
    const mobileBlockStart = css.indexOf('@media (max-width: 47.99rem)');
    const secondaryRuleStart = css.indexOf('.design-library-filter-controls-secondary {', mobileBlockStart);
    assert.ok(secondaryRuleStart > mobileBlockStart);
    const secondaryRule = css.slice(secondaryRuleStart, secondaryRuleStart + 300);
    assert.match(secondaryRule, /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
    assert.doesNotMatch(secondaryRule, /minmax\(0, 1fr\) auto auto/);
  });

  it('all four secondary controls stretch to fill their grid cell on mobile (no shrink-wrapped overflow)', () => {
    const mobileBlockStart = css.indexOf('@media (max-width: 47.99rem)');
    const mobileBlockEnd = css.indexOf('\n@media (min-width: 48rem)');
    const mobileBlock = css.slice(mobileBlockStart, mobileBlockEnd);
    assert.match(mobileBlock, /\.design-library-filter-controls \.design-library-filter-controls-category \{[^}]*width:\s*100%/);
    assert.match(mobileBlock, /\.design-library-filter-dock \.design-library-halftone-filter \{[^}]*width:\s*100%/);
    assert.match(
      mobileBlock,
      /\.design-library-filter-dock \.design-library-filter-controls-secondary \.design-library-filter-tags-button \{[^}]*width:\s*100%/,
    );

    const explicitMobileBlockStart = css.indexOf(
      '@media (max-width: 47.99rem)',
      css.indexOf('design-library-explicit-content-filter-label {'),
    );
    const explicitMobileBlock = css.slice(explicitMobileBlockStart, explicitMobileBlockStart + 600);
    assert.match(explicitMobileBlock, /\.design-library-explicit-content-filter \{[^}]*width:\s*100%/);
  });

  it('desktop (>=48rem) layout is unchanged — no wrap, filters stay a single row', () => {
    const desktopBlockStart = css.indexOf('@media (min-width: 48rem)');
    const desktopBlock = css.slice(desktopBlockStart, desktopBlockStart + 800);
    assert.match(desktopBlock, /flex-wrap:\s*nowrap/);
    assert.match(desktopBlock, /\.design-library-filter-controls-secondary \{[^}]*flex-wrap:\s*nowrap/);
  });
});

describe('Request / cart surfaces never censor library artwork once added', () => {
  it('CurrentRequestDrawer does not pass isExplicitContent to CatalogThumbnailPanel', () => {
    const source = read('apps/portal/features/print-requests/components/CurrentRequestDrawer.tsx');
    const thumbStart = source.indexOf('<CatalogThumbnailPanel');
    assert.notEqual(thumbStart, -1);
    const thumbEnd = source.indexOf('/>', thumbStart);
    const tag = source.slice(thumbStart, thumbEnd);
    assert.doesNotMatch(tag, /isExplicitContent/);
  });

  it('PortalPrintRequestItemCard does not pass isExplicitContent (request details / show pages)', () => {
    const source = read('apps/portal/features/print-requests/components/PortalPrintRequestItemCard.tsx');
    const thumbStart = source.indexOf('<CatalogThumbnailPanel');
    assert.notEqual(thumbStart, -1);
    const thumbEnd = source.indexOf('/>', thumbStart);
    const tag = source.slice(thumbStart, thumbEnd);
    assert.doesNotMatch(tag, /isExplicitContent/);
  });
});
