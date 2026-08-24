'use client';

import { Suspense } from 'react';

import { ShowDesignGalleryPageContent } from '../../../../features/show-designs/pages/ShowDesignGalleryPageContent';

export default function ShowDesignGalleryPage() {
  return (
    <Suspense fallback={<div className="portal-page portal-muted">Loading show designs…</div>}>
      <ShowDesignGalleryPageContent />
    </Suspense>
  );
}
