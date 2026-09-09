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
  });

  it('keeps the page read-only with show picker, stats, View Designs, and no inline item dumps', () => {
    assert.match(pageSource, /PortalAdminShowPickerModal/);
    assert.match(pageSource, /View Designs/);
    assert.match(pageSource, /designQty/);
    assert.match(pageSource, /printQty/);
    assert.match(pageSource, /prQty/);
    assert.match(pageSource, /requestOwnerLabel/);
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
