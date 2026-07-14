'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';

import { CATALOG_LIBRARY_PATH } from '../../../../features/print-requests/utils/catalogSelectionNavigation';

function CatalogLibraryRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const query = searchParams.toString();
    router.replace(query ? `${CATALOG_LIBRARY_PATH}?${query}` : CATALOG_LIBRARY_PATH);
  }, [router, searchParams]);

  return <div className="portal-page portal-muted">Redirecting to Design Library…</div>;
}

/** Legacy `/catalog/library` bookmarks → `/catalog`. */
export default function CatalogLibraryRedirectPage() {
  return (
    <Suspense fallback={<div className="portal-page portal-muted">Redirecting to Design Library…</div>}>
      <CatalogLibraryRedirect />
    </Suspense>
  );
}
