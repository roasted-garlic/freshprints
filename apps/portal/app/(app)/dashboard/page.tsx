'use client';

import Link from 'next/link';
import type { Timestamp } from 'firebase/firestore';

import { useAuth } from '../../../features/auth/context/AuthContext';

function formatMemberSince(timestamp: Timestamp): string {
  return timestamp.toDate().toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
}

function getProfileInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return '?';
  }

  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }

  return `${parts[0]![0] ?? ''}${parts[parts.length - 1]![0] ?? ''}`.toUpperCase();
}

export default function DashboardPage() {
  const { customer, user } = useAuth();
  const displayName = customer?.displayName ?? user?.displayName ?? 'Your account';
  const email = user?.email ?? customer?.email ?? '—';
  const username = customer?.username;
  const printRequestCount = customer?.totalPrintRequests ?? 0;

  return (
    <main className="portal-page portal-account-page">
      <header className="portal-page-header">
        <h1>Your account</h1>
        <p className="portal-muted">Manage your profile and jump back into your print workflow.</p>
      </header>

      <div className="portal-account-layout">
        <section aria-label="Profile" className="portal-account-profile-card">
          <div aria-hidden="true" className="portal-account-avatar">
            {getProfileInitials(displayName)}
          </div>
          <div className="portal-account-profile-copy">
            <h2>{displayName}</h2>
            {username ? <p className="portal-account-handle">@{username}</p> : null}
            <p className="portal-account-email">{email}</p>
          </div>
        </section>

        <section className="portal-panel portal-account-panel">
          <h2 className="portal-account-section-title">Overview</h2>
          <dl className="portal-account-stat-grid">
            <div>
              <dt>Member since</dt>
              <dd>{customer?.createdAt ? formatMemberSince(customer.createdAt) : '—'}</dd>
            </div>
            <div>
              <dt>Print requests</dt>
              <dd>{printRequestCount}</dd>
            </div>
          </dl>
        </section>

        <section className="portal-panel portal-account-panel">
          <h2 className="portal-account-section-title">Quick links</h2>
          <div className="portal-account-link-grid">
            <Link className="portal-account-quick-link" href="/catalog">
              <span className="portal-account-quick-link-label">Browse designs</span>
              <span className="portal-account-quick-link-description">
                Explore the catalog and start a new print request.
              </span>
            </Link>
            <Link className="portal-account-quick-link" href="/requests?tab=working">
              <span className="portal-account-quick-link-label">My print requests</span>
              <span className="portal-account-quick-link-description">
                Continue drafts or review queued and printed work.
              </span>
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
