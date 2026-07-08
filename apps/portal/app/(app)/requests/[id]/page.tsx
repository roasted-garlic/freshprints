'use client';

import dynamic from 'next/dynamic';

const PrintRequestDetailView = dynamic(() => import('./PrintRequestDetailView'), {
  ssr: false,
  loading: () => <div className="portal-panel portal-muted">Loading print request…</div>,
});

export default function PrintRequestDetailPage() {
  return <PrintRequestDetailView />;
}
