'use client';

import { Suspense } from 'react';

import { CatalogHomePageContent } from '../../../features/catalog/pages/CatalogHomePageContent';

export default function CatalogPage() {
  return (
    <Suspense fallback={<div className="portal-page portal-muted">Loading designs…</div>}>
      <CatalogHomePageContent />
    </Suspense>
  );
}
