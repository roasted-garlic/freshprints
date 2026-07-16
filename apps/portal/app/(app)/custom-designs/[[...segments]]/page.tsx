'use client';

import { Suspense } from 'react';

import { EtsyRecommendationsPageContent } from '../../../../features/etsy-recommendations/pages/EtsyRecommendationsPageContent';

export default function CustomDesignsCatchAllPage() {
  return (
    <Suspense
      fallback={
        <main className="portal-page etsy-recommendations-page">
          <p className="portal-muted">Loading…</p>
        </main>
      }
    >
      <EtsyRecommendationsPageContent />
    </Suspense>
  );
}
