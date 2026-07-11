'use client';

import { Suspense } from 'react';

import { CatalogPageContent } from '../../../../features/catalog/pages/CatalogPageContent';

export default function CatalogLibraryPage() {
  return (
    <Suspense fallback={<div className="portal-page portal-muted">Loading design library…</div>}>
      <CatalogPageContent />
    </Suspense>
  );
}
