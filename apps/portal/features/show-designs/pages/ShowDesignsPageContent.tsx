'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import type { PortalPublicShowSummary } from '@fresh-prints/shared/types/portal/listPortalPublicShows.types';

import { OurShowsCalendar } from '../components/OurShowsCalendar';
import { getPortalPublicShowsReadCacheSnapshot } from '../services/portalPublicShowsReadCache';
import { portalShowDesignsService } from '../services/portalShowDesignsService';

export function ShowDesignsPageContent() {
  const router = useRouter();
  const [shows, setShows] = useState<PortalPublicShowSummary[]>(
    () => getPortalPublicShowsReadCacheSnapshot()?.response.shows ?? [],
  );
  const [isLoadingShows, setIsLoadingShows] = useState(
    () => getPortalPublicShowsReadCacheSnapshot() === null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const snapshot = getPortalPublicShowsReadCacheSnapshot();
    if (snapshot) {
      setShows(snapshot.response.shows);
      setIsLoadingShows(false);
    } else {
      setIsLoadingShows(true);
    }
    setError(null);

    void (async () => {
      try {
        const result = await portalShowDesignsService.listPublicShows();
        if (!cancelled) {
          setShows(result.shows);
          setError(null);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load shows.');
        }
      } finally {
        if (!cancelled) {
          setIsLoadingShows(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="portal-page portal-our-shows-page">
      <header className="our-shows-intro">
        <h1>Upcoming Shows</h1>
        <p>
          Check out the designs already attached to Whatnot shows. Tap a highlighted day to browse
          what is on that show — including past shows so you can see what recently aired.
        </p>
      </header>

      <OurShowsCalendar
        onOpenShow={(showId) => {
          router.push(`/shows/${showId}`);
        }}
        shows={shows}
      />

      {isLoadingShows ? (
        <p aria-live="polite" className="our-shows-metadata-status portal-muted">
          Loading upcoming shows…
        </p>
      ) : null}
      {error ? <p className="portal-form-error">{error}</p> : null}
      {!isLoadingShows && !error && shows.length === 0 ? (
        <p className="portal-muted" style={{ textAlign: 'center' }}>
          No public shows are on the calendar right now. Check back soon.
        </p>
      ) : null}
    </main>
  );
}
