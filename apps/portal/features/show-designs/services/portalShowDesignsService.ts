import type { ListPortalPublicShowsResponse } from '@fresh-prints/shared/types/portal/listPortalPublicShows.types';
import type {
  ListPortalShowCatalogDesignsRequest,
  ListPortalShowCatalogDesignsResponse,
} from '@fresh-prints/shared/types/portal/listPortalShowCatalogDesigns.types';

import { callTracedFunction } from '../../../lib/firebase/tracedCallable';

export const portalShowDesignsService = {
  async listPublicShows(): Promise<ListPortalPublicShowsResponse> {
    return callTracedFunction<Record<string, never>, ListPortalPublicShowsResponse>(
      'listPortalPublicShows',
      { source: 'portalShowDesignsService.listPublicShows' },
    )({});
  },

  async listShowCatalogDesigns(
    input: ListPortalShowCatalogDesignsRequest,
  ): Promise<ListPortalShowCatalogDesignsResponse> {
    return callTracedFunction<
      ListPortalShowCatalogDesignsRequest,
      ListPortalShowCatalogDesignsResponse
    >('listPortalShowCatalogDesigns', {
      source: 'portalShowDesignsService.listShowCatalogDesigns',
    })(input);
  },
};
