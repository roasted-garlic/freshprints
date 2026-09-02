import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const PAGE_PATH = 'apps/portal/features/show-designs/pages/ShowDesignsPageContent.tsx';
const CALENDAR_PATH = 'apps/portal/features/show-designs/components/OurShowsCalendar.tsx';
const CSS_PATH = 'apps/portal/styles/our-shows.css';

function read(path: string): string {
  return readFileSync(path, 'utf8');
}

describe('ShowDesignsPageContent shell-first calendar', () => {
  it('always mounts OurShowsCalendar and does not gate it on loading or error', () => {
    const page = read(PAGE_PATH);
    assert.match(page, /<OurShowsCalendar[\s\S]*shows=\{shows\}/);
    assert.doesNotMatch(page, /!isLoading\s*&&\s*!error/);
    assert.doesNotMatch(page, /PortalLoadingPanel/);
    assert.doesNotMatch(page, /isLoading\s*\?\s*<PortalLoadingPanel/);
  });

  it('uses a localized metadata loading status instead of replacing the calendar', () => {
    const page = read(PAGE_PATH);
    assert.match(page, /isLoadingShows/);
    assert.match(page, /Loading upcoming shows…/);
    assert.match(page, /our-shows-metadata-status/);
  });

  it('keeps the calendar visible when show metadata fails', () => {
    const page = read(PAGE_PATH);
    assert.match(page, /Unable to load shows/);
    assert.match(page, /<OurShowsCalendar/);
    assert.doesNotMatch(page, /!error\s*\?\s*\(/);
  });

  it('loads public shows once via a mount-only effect', () => {
    const page = read(PAGE_PATH);
    assert.match(page, /useEffect\(\(\)\s*=>\s*\{/);
    assert.match(page, /\}, \[\]\);/);
    assert.match(page, /portalShowDesignsService\.listPublicShows\(\)/);
    assert.equal((page.match(/listPublicShows\(\)/g) ?? []).length, 1);
  });

  it('paints cached public shows immediately via cache snapshot (SWR-style)', () => {
    const page = read(PAGE_PATH);
    assert.match(page, /getPortalPublicShowsReadCacheSnapshot/);
    assert.match(page, /useState[\s\S]*getPortalPublicShowsReadCacheSnapshot\(\)\?\.response\.shows/);
  });

  it('shows an empty-copy message only after load completes with zero shows', () => {
    const page = read(PAGE_PATH);
    assert.match(
      page,
      /!isLoadingShows\s*&&\s*!error\s*&&\s*shows\.length\s*===\s*0/,
    );
    assert.match(page, /No public shows are on the calendar right now/);
  });
});

describe('OurShowsCalendar today semantics', () => {
  it('applies is-today, aria-current=date, and shared aria label helper', () => {
    const calendar = read(CALENDAR_PATH);
    assert.match(calendar, /day\.isToday \? 'is-today' : ''/);
    assert.match(calendar, /aria-current=\{day\.isToday \? 'date' : undefined\}/);
    assert.match(calendar, /formatOurShowsDayAriaLabel/);
  });

  it('starts the view month from browser-local now, not earliest show', () => {
    const calendar = read(CALENDAR_PATH);
    assert.match(calendar, /formatCalendarMonthLabel\(now\.getFullYear\(\), now\.getMonth\(\)\)/);
    assert.doesNotMatch(calendar, /getEarliestShowDateKey/);
  });

  it('keeps month navigation as local state only', () => {
    const calendar = read(CALENDAR_PATH);
    assert.match(calendar, /shiftCalendarMonth\(viewYear, viewMonth, -1\)/);
    assert.match(calendar, /shiftCalendarMonth\(viewYear, viewMonth, 1\)/);
    assert.doesNotMatch(calendar, /listPublicShows/);
    assert.doesNotMatch(calendar, /useEffect/);
  });

  it('memoizes show grouping from the shows prop', () => {
    const calendar = read(CALENDAR_PATH);
    assert.match(calendar, /useMemo\(\(\)\s*=>\s*\{[\s\S]*for \(const show of shows\)/);
    assert.match(calendar, /\}, \[now, shows\]\);/);
  });
});

describe('our-shows.css today treatment', () => {
  it('brightens the whole today cell without glow or accent fill', () => {
    const css = read(CSS_PATH);
    assert.match(css, /\.our-shows-day\.is-today\s*\{/);
    assert.match(css, /background:\s*color-mix/);
    assert.match(css, /border-color:\s*color-mix/);
    assert.doesNotMatch(css, /box-shadow:\s*0\s+0\s+[0-9]+px/);
    assert.doesNotMatch(css, /@keyframes/);
  });

  it('keeps upcoming show borders softer than solid success and layers today+show', () => {
    const css = read(CSS_PATH);
    assert.match(
      css,
      /\.our-shows-day\.has-shows\.is-border-low\s*\{[\s\S]*?border-color:\s*color-mix\([\s\S]*?success/,
    );
    assert.doesNotMatch(
      css,
      /\.our-shows-day\.has-shows\.is-border-low\s*\{\s*border-color:\s*var\(--color-success/,
    );
    assert.match(css, /\.our-shows-day\.is-today\.has-shows\.is-timing-upcoming\s*\{/);
    assert.match(css, /\.our-shows-day\.is-today\.has-shows\.is-border-low\s*\{/);
  });
});
