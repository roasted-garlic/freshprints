'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

import type { PrintRequest } from '@fresh-prints/shared/types/printRequest/printRequest.types';
import type { PortalPrintRequestListTab } from '@fresh-prints/shared/utils/portalPrintRequestListTabs';
import type { Timestamp } from 'firebase/firestore';

import { buildRequestDetailHref } from '../utils/portalRequestDetailReturn';

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
  fromTab?: PortalPrintRequestListTab;
  request: PrintRequest;
  progressLabel?: string;
  scheduleLine?: string | null;
}

export function PrintRequestCard({ fromTab, request, progressLabel, scheduleLine }: PrintRequestCardProps) {
  const label = progressLabel ?? getStatusLabel(request.status);
  const href = buildRequestDetailHref(request.id, {
    from: fromTab ?? 'working',
  });

  return (
    <Link className="portal-request-card" href={href}>
      <div className="portal-request-card-header">
        <h2>{request.name}</h2>
        <span className="portal-request-status-chip">
          {label}
          <ChevronRight aria-hidden size={16} strokeWidth={2} />
        </span>
      </div>
      <p className="portal-muted">
        {request.itemCount} design{request.itemCount === 1 ? '' : 's'} · Updated{' '}
        {formatUpdatedDate(request.updatedAt)}
      </p>
      {scheduleLine ? <p className="portal-muted portal-request-card-schedule">{scheduleLine}</p> : null}
    </Link>
  );
}
