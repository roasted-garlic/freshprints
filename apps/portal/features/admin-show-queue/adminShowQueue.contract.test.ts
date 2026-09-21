import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

describe('Portal admin Show Queue architecture contracts', () => {
  const featureRoot = resolve(import.meta.dirname);
  const shellSource = readFileSync(resolve(featureRoot, 'components/PortalAdminShell.tsx'), 'utf8');
  const pickerSource = readFileSync(resolve(featureRoot, 'components/PortalAdminShowPickerModal.tsx'), 'utf8');
  const gateSource = readFileSync(resolve(featureRoot, 'components/PortalAdminAuthGate.tsx'), 'utf8');
  const layoutSource = readFileSync(resolve(featureRoot, '../../app/(admin)/layout.tsx'), 'utf8');
  const serviceSource = readFileSync(resolve(featureRoot, 'services/portalAdminShowQueueService.ts'), 'utf8');
  const pageSource = readFileSync(resolve(featureRoot, 'pages/PortalAdminShowQueuePage.tsx'), 'utf8');
  const hookSource = readFileSync(resolve(featureRoot, 'hooks/usePortalAdminShowQueue.ts'), 'utf8');
  const modalSource = readFileSync(resolve(featureRoot, 'components/PortalAdminViewDesignsModal.tsx'), 'utf8');
  const styleSource = readFileSync(resolve(featureRoot, '../../styles/admin-show-queue.css'), 'utf8');

  it('uses a separate shell and does not mount customer providers', () => {
    assert.match(layoutSource, /PortalAdminShell/);
    assert.doesNotMatch(
      shellSource,
      /PortalAppShell|PortalPrintRequestProvider|FavoritesProvider|PortalNotificationsProvider|CurrentRequestDrawer|PortalSidebar/,
    );
    assert.doesNotMatch(pageSource, /PortalAdminShowSidebar|PortalSidebar|portalNavItems/);
  });

  it('gates the page to the portal-admin session and uses dashboard callables', () => {
    assert.match(gateSource, /bootstrapStatus === 'portal-admin'/);
    assert.match(gateSource, /buildPortalAuthHref\('\/login', '\/admin\/show-queue'\)/);
    assert.match(serviceSource, /getPortalAdminUpcomingShowQueueDashboard/);
    assert.match(serviceSource, /getPortalAdminShowQueueRequestDesigns/);
    assert.doesNotMatch(serviceSource, /getPortalAdminDailyShowQueue/);
    assert.match(gateSource, /portal-admin-state-card/);
    assert.match(gateSource, />Access denied</);
    assert.match(gateSource, /contact a Fresh Prints administrator/);
    assert.doesNotMatch(gateSource, /\{error\}/);
    assert.match(styleSource, /\.portal-admin-state-card/);
    assert.match(styleSource, /min-height: 100dvh/);
  });

  it('keeps the page read-only with show picker, stats, View Designs, and no inline item dumps', () => {
    assert.match(pageSource, /PortalAdminShowPickerModal/);
    assert.match(pageSource, /View Designs/);
    assert.match(pageSource, /designQty/);
    assert.match(pageSource, /printQty/);
    assert.match(pageSource, /prQty/);
    assert.match(pageSource, /portal-admin-stat-pill/);
    assert.doesNotMatch(pageSource, /statusSummary/);
    assert.doesNotMatch(pageSource, /Customer Request/);
    assert.match(pageSource, /Loading upcoming Show Queue/);
    assert.match(pageSource, /Try again/);
    assert.match(pageSource, /Refresh/);
    assert.match(pageSource, /No upcoming Show Queue shows/);
    assert.doesNotMatch(pageSource, />Start<|>Pause<|>Resume<|>Finish<|>Move<|>Release<|>Export</);
    assert.doesNotMatch(pageSource, /items\.map/);
  });

  it('provides accessible request search, grouped cards, and separate totals', () => {
    assert.match(pageSource, /Search Print Requests/);
    assert.match(pageSource, /portal-admin-request-search-input/);
    assert.match(pageSource, /type="search"/);
    assert.match(pageSource, /Request title or customer/);
    assert.match(pageSource, /onInput=\{/);
    assert.doesNotMatch(pageSource, /Clear search/);
    assert.doesNotMatch(pageSource, /Request ID/);
    assert.match(pageSource, /groupPortalAdminShowQueueRequests/);
    assert.match(pageSource, /portal-admin-request-group-toggle/);
    assert.match(pageSource, /aria-expanded=/);
    assert.match(pageSource, /expandedGroupKeys/);
    assert.match(pageSource, /formatRequestCountLabel/);
    assert.match(pageSource, /formatTotalQuantityLabel/);
    assert.match(pageSource, /Request total/);
    assert.match(pageSource, /Show total/);
    assert.doesNotMatch(pageSource, /Selected-show total/);
    assert.match(pageSource, /sumPortalAdminShowAllocationTotalPriceUsd/);
    assert.match(styleSource, /portal-admin-request-groups/);
    assert.match(styleSource, /portal-admin-request-group-toggle/);
    assert.match(styleSource, /portal-admin-request-search/);
  });

  it('lazy-loads designs in a modal and clears modal on show change', () => {
    assert.match(modalSource, /loadRequestDesigns/);
    assert.match(modalSource, /formatDesignSizeTierLabel/);
    assert.match(modalSource, /formatDesignSourceLabel/);
    assert.match(modalSource, /Design Library/);
    assert.match(modalSource, /Uploaded/);
    assert.match(modalSource, /GANG_SHEET_PRICING_TIER_LABELS/);
    assert.match(modalSource, /item\.origin !== 'standard'/);
    assert.doesNotMatch(modalSource, /\{item\.origin\} · \{item\.source/);
    assert.doesNotMatch(modalSource, /item\.status\.replace/);
    assert.match(pageSource, /setModal\(null\)/);
    assert.match(pageSource, /selectedShowId/);
  });

  it('opens design previews in the shared lightbox with previous/next navigation', () => {
    assert.match(modalSource, /CatalogPreviewLightbox/);
    assert.match(modalSource, /ExplicitContentPreferenceProvider/);
    assert.match(modalSource, /artworkBackgroundHex/);
    assert.match(modalSource, /navigationItems/);
    assert.match(modalSource, /onActiveItemChange=\{setLightboxActiveId\}/);
    assert.match(modalSource, /portal-admin-design-thumb-button/);
    assert.match(styleSource, /portal-admin-designs-modal/);
    assert.match(styleSource, /portal-admin-design-lightbox/);
    assert.match(styleSource, /--color-artwork-preview-bg/);
  });

  it('applies artwork preview background on thumbnails for any source that provides hex', () => {
    assert.match(modalSource, /item\.artworkBackgroundHex/);
    assert.match(modalSource, /--color-artwork-preview-bg/);
    assert.doesNotMatch(
      modalSource,
      /item\.source === 'catalog_design' && item\.artworkBackgroundHex/,
    );
    assert.match(styleSource, /\.portal-admin-design-thumb \{[\s\S]*?background: var\(--color-artwork-preview-bg/);
  });

  it('opens show selection from a header hamburger on desktop and mobile', () => {
    assert.match(shellSource, /portal-admin-menu-icon/);
    assert.match(shellSource, /openShowPicker/);
    assert.match(shellSource, /aria-controls="portal-admin-show-picker-title"/);
    assert.match(pickerSource, /Select a show/);
    assert.match(pickerSource, /closeShowPicker/);
    assert.doesNotMatch(pageSource, /PortalAdminShowSidebar/);
    assert.doesNotMatch(styleSource, /portal-admin-show-sidebar/);
    assert.doesNotMatch(styleSource, /translateX\(-100%\)/);
  });

  it('exposes the separate Staff Artwork Upload admin destination', () => {
    assert.match(shellSource, /aria-label="Admin destinations"/);
    assert.match(shellSource, /href="\/admin\/show-queue"/);
    assert.match(shellSource, /href="\/admin\/staff-artwork"/);
    assert.match(shellSource, /Staff Artwork Upload/);
    assert.match(shellSource, /aria-current=\{isStaffArtworkUpload \? 'page' : undefined\}/);
    assert.match(shellSource, /pathname === '\/admin\/staff-artwork'/);
    assert.match(styleSource, /\.portal-admin-nav/);
  });

  it('re-arms the mount guard so settled loads clear loading after a development remount', () => {
    assert.match(hookSource, /armPortalAdminShowQueueMount\(mountedRef\)/);
    assert.match(hookSource, /refreshPortalAdminShowQueue\(/);
  });

  it('caches visited show responses and waits for an in-flight load before switching', () => {
    assert.match(hookSource, /dashboardCacheRef/);
    assert.match(hookSource, /cachedAfterWait/);
    assert.match(hookSource, /await inFlight/);
  });
});
