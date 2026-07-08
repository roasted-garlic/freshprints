'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

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
  progressLabel?: string;
}

export function PrintRequestCard({ request, progressLabel }: PrintRequestCardProps) {
  const label = progressLabel ?? getStatusLabel(request.status);
  const isContinueRequest = label === 'Working';

  return (
    <Link className="portal-request-card" href={`/requests/${request.id}`}>
      <div className="portal-request-card-header">
        <h2>{request.name}</h2>
        <span
          className={
            isContinueRequest
              ? 'portal-request-status-chip portal-request-status-chip-continue'
              : 'portal-request-status-chip'
          }
        >
          {isContinueRequest ? (
            <>
              Continue Request
              <ChevronRight aria-hidden size={16} strokeWidth={2} />
            </>
          ) : (
            label
          )}
        </span>
      </div>
      <p className="portal-muted">
        {request.itemCount} design{request.itemCount === 1 ? '' : 's'} · Updated{' '}
        {formatUpdatedDate(request.updatedAt)}
      </p>
    </Link>
  );
}
