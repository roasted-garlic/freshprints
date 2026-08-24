'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { PortalLoadingPanel } from '../../shared/components/PortalLoadingPanel';
import { OurShowsCalendar } from '../components/OurShowsCalendar';
import { portalShowDesignsService } from '../services/portalShowDesignsService';

export function ShowDesignsPageContent() {
  const router = useRouter();
  const [shows, setShows] = useState<
    Awaited<ReturnType<typeof portalShowDesignsService.listPublicShows>>['shows']
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await portalShowDesignsService.listPublicShows();
        if (!cancelled) {
          setShows(result.shows);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load shows.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
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

      {isLoading ? <PortalLoadingPanel label="Loading show calendar." /> : null}
      {error ? <p className="portal-form-error">{error}</p> : null}

      {!isLoading && !error ? (
        shows.length === 0 ? (
          <p className="portal-muted" style={{ textAlign: 'center' }}>
            No public shows are on the calendar right now. Check back soon.
          </p>
        ) : (
          <OurShowsCalendar
            onOpenShow={(showId) => {
              router.push(`/shows/${showId}`);
            }}
            shows={shows}
          />
        )
      ) : null}
    </main>
  );
}
