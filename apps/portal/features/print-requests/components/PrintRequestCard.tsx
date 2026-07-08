'use client';

import Link from 'next/link';

import type { PrintRequest } from '@fresh-prints/shared/types/printRequest/printRequest.types';
import type { Timestamp } from 'firebase/firestore';

function formatUpdatedDate(timestamp: Timestamp): string {
  const date = timestamp.toDate();
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getStatusLabel(status: PrintRequest['status']): string {
  switch (status) {
    case 'draft':
      return 'Draft';
    case 'editing':
      return 'Editing';
    case 'active':
      return 'Active';
    case 'completed':
      return 'Completed';
    case 'archived':
      return 'Archived';
    default:
      return status;
  }
}

interface PrintRequestCardProps {
  request: PrintRequest;
}

export function PrintRequestCard({ request }: PrintRequestCardProps) {
  return (
    <Link className="portal-request-card" href={`/requests/${request.id}`}>
      <div className="portal-request-card-header">
        <h2>{request.name}</h2>
        <span className="portal-request-status-chip">{getStatusLabel(request.status)}</span>
      </div>
      <p className="portal-muted">
        {request.itemCount} design{request.itemCount === 1 ? '' : 's'} · Updated{' '}
        {formatUpdatedDate(request.updatedAt)}
      </p>
    </Link>
  );
}
