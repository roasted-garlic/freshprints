'use client';

import { Suspense } from 'react';

import { AssistedCreationPageContent } from '../../../../features/assisted-creation/pages/AssistedCreationPageContent';
import { useLiveCustomDesignsLocation } from '../../../../features/assisted-creation/hooks/useLiveCustomDesignsLocation';
import { isAssistedCreationLocation } from '../../../../features/assisted-creation/utils/assistedCreationUrlState';
import { EtsyRecommendationsPageContent } from '../../../../features/etsy-recommendations/pages/EtsyRecommendationsPageContent';

function CustomDesignsRouter() {
  const { ready, pathname, searchParams } = useLiveCustomDesignsLocation();

  if (!ready) {
    return (
      <main className="portal-page etsy-recommendations-page">
        <p className="portal-muted">Loading…</p>
      </main>
    );
  }

  if (isAssistedCreationLocation(pathname, searchParams)) {
    return <AssistedCreationPageContent />;
  }
  return <EtsyRecommendationsPageContent />;
}

export default function CustomDesignsCatchAllPage() {
  return (
    <Suspense
      fallback={
        <main className="portal-page etsy-recommendations-page">
          <p className="portal-muted">Loading…</p>
        </main>
      }
    >
      <CustomDesignsRouter />
    </Suspense>
  );
}
