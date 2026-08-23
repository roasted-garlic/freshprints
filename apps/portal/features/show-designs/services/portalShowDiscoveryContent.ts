import { CATALOG_DISCOVERY_RAIL_LIMIT } from '@fresh-prints/shared/utils/catalogDiscoveryRanking';
import {
  findNextUpcomingShowWithDesigns,
  findShowsThisWeekWithDesigns,
} from '@fresh-prints/shared/utils/portalShowDiscovery';
import { formatShowDateTimeLabel } from '@fresh-prints/shared/utils/showDateTimeDisplay';

import type { CatalogDesign } from '../../catalog/types/catalog.types';
import { catalogService } from '../../catalog/services/catalogService';
import { portalShowDesignsService } from '../services/portalShowDesignsService';

async function hydrateShowDesigns(showIds: readonly string[]): Promise<CatalogDesign[]> {
  if (showIds.length === 0) {
    return [];
  }

  const designLists = await Promise.all(
    showIds.map(async (showId) => {
      const result = await portalShowDesignsService.listShowCatalogDesigns({ upcomingShowId: showId });
      return result.designs.map((design) => design.id);
    }),
  );

  const uniqueDesignIds = [...new Set(designLists.flat())];
  return catalogService.getReadyDesignsByIds(uniqueDesignIds);
}

function takeRailDesigns(designs: readonly CatalogDesign[]): CatalogDesign[] {
  return designs.slice(0, CATALOG_DISCOVERY_RAIL_LIMIT);
}

export interface PortalShowHomeRail {
  designs: CatalogDesign[];
  key: string;
  showId?: string;
  title: string;
  viewAllDiscover?: 'showsThisWeek';
  viewAllShowId?: string;
}

export async function loadPortalShowHomeRails(): Promise<PortalShowHomeRail[]> {
  const { shows } = await portalShowDesignsService.listPublicShows();
  const now = new Date();
  const rails: PortalShowHomeRail[] = [];

  const nextShow = findNextUpcomingShowWithDesigns(shows, now);
  if (nextShow) {
    const designs = takeRailDesigns(
      await hydrateShowDesigns([nextShow.id]),
    );
    if (designs.length > 0) {
      const scheduledAt = nextShow.scheduledStartAt
        ? formatShowDateTimeLabel(new Date(nextShow.scheduledStartAt))
        : 'Upcoming show';
      rails.push({
        key: `show:${nextShow.id}`,
        title: `Next Show — ${scheduledAt}`,
        designs,
        showId: nextShow.id,
        viewAllShowId: nextShow.id,
      });
    }
  }

  const weekShows = findShowsThisWeekWithDesigns(shows, now);
  if (weekShows.length > 0) {
    const designs = takeRailDesigns(await hydrateShowDesigns(weekShows.map((entry) => entry.id)));
    if (designs.length > 0) {
      rails.push({
        key: 'shows-this-week',
        title: 'Added to Shows This Week',
        designs,
        viewAllDiscover: 'showsThisWeek',
      });
    }
  }

  return rails;
}

export async function loadCatalogShowDesigns(input: {
  showId?: string | null;
  showsThisWeek?: boolean;
}): Promise<{ designs: CatalogDesign[]; subtitle: string | null; title: string }> {
  const { shows } = await portalShowDesignsService.listPublicShows();
  const now = new Date();

  if (input.showId) {
    const show = shows.find((entry) => entry.id === input.showId) ?? null;
    const designs = await hydrateShowDesigns([input.showId]);
    const scheduledAt = show?.scheduledStartAt
      ? formatShowDateTimeLabel(new Date(show.scheduledStartAt))
      : null;

    return {
      designs,
      title: scheduledAt ? `Next Show — ${scheduledAt}` : 'Show designs',
      subtitle: 'Designs currently requested for the next Whatnot show.',
    };
  }

  if (input.showsThisWeek) {
    const weekShows = findShowsThisWeekWithDesigns(shows, now);
    const designs = await hydrateShowDesigns(weekShows.map((entry) => entry.id));

    return {
      designs,
      title: 'Added to Shows This Week',
      subtitle:
        weekShows.length > 0
          ? `${weekShows.length} upcoming show${weekShows.length === 1 ? '' : 's'} this week with designs attached.`
          : 'No upcoming shows with designs are scheduled this week.',
    };
  }

  return {
    designs: [],
    title: 'Show designs',
    subtitle: null,
  };
}
