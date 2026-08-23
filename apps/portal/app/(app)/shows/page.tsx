'use client';

import { Suspense } from 'react';

import { ShowDesignsPageContent } from '../../../features/show-designs/pages/ShowDesignsPageContent';

export default function ShowDesignsPage() {
  return (
    <Suspense fallback={<div className="portal-page portal-muted">Loading show designs…</div>}>
      <ShowDesignsPageContent />
    </Suspense>
  );
}
