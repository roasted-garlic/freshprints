'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { Timestamp } from 'firebase/firestore';

import { AccountArtworkGallery } from '../../../features/account/components/AccountArtworkGallery';
import { AccountNotificationsModal } from '../../../features/account/components/AccountNotificationsModal';
import { getProfileInitials, resolvePortalDisplayName } from '../../../features/account/utils/profileDisplay';
import { useAuth } from '../../../features/auth/context/AuthContext';
import { useFavorites } from '../../../features/favorites/context/FavoritesProvider';
import { PORTAL_FAVORITES_HREF } from '../../../features/navigation/constants/portalNavItems';
import { usePortalPrintRequests } from '../../../features/print-requests/context/PortalPrintRequestContext';
import {
  buildRequestArtworkHref,
  CATALOG_HOME_PATH,
} from '../../../features/print-requests/utils/catalogSelectionNavigation';

function formatMemberSince(timestamp: Timestamp): string {
  return timestamp.toDate().toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
}

export default function DashboardPage() {
  const { customer, firebaseUser, refreshCustomer, user } = useAuth();
  const { favoriteCount, isLoading: isFavoritesLoading } = useFavorites();
  const { isLoading: isRequestsLoading, refreshRequests, requests } = usePortalPrintRequests();
  const [uploadedDesignCount, setUploadedDesignCount] = useState<number | null>(null);
  const [donatedDesignCount, setDonatedDesignCount] = useState<number | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const displayName = resolvePortalDisplayName(customer?.displayName, user?.displayName);
  const email = user?.email ?? customer?.email ?? '—';
  const username = customer?.username;
  const printRequestCount = isRequestsLoading ? (customer?.totalPrintRequests ?? 0) : requests.length;
  const uploadHref = buildRequestArtworkHref({ returnTo: '/dashboard' });
  const customerUid = firebaseUser?.uid ?? user?.id;
  const favoritesLabel = isFavoritesLoading
    ? 'My Favorites'
    : `My Favorites (${favoriteCount})`;

  const handleArtworkCountsChange = useCallback(
    (counts: { donatedCount: number; uploadCount: number }) => {
      setUploadedDesignCount(counts.uploadCount);
      setDonatedDesignCount(counts.donatedCount);
    },
    [],
  );

  useEffect(() => {
    void refreshRequests({ silent: true });
    void refreshCustomer();
  }, [refreshCustomer, refreshRequests]);

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

        <section className="portal-panel portal-account-panel portal-account-overview-panel">
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
            <div>
              <dt>Uploaded designs</dt>
              <dd>{uploadedDesignCount === null ? '…' : uploadedDesignCount}</dd>
            </div>
            <div>
              <dt>Donated designs</dt>
              <dd>{donatedDesignCount === null ? '…' : donatedDesignCount}</dd>
            </div>
          </dl>

          <AccountArtworkGallery
            customerUid={customerUid}
            embedded
            onArtworkCountsChange={handleArtworkCountsChange}
          />
        </section>

        <section className="portal-panel portal-account-panel">
          <h2 className="portal-account-section-title">Settings</h2>
          <div className="portal-account-link-grid">
            <button
              className="portal-account-quick-link"
              onClick={() => setNotificationsOpen(true)}
              type="button"
            >
              <span className="portal-account-quick-link-label">Notifications</span>
              <span className="portal-account-quick-link-description">
                Choose whether to get email when a custom design proof is ready.
              </span>
            </button>
          </div>
        </section>

        <section className="portal-panel portal-account-panel">
          <h2 className="portal-account-section-title">Quick links</h2>
          <div className="portal-account-link-grid">
            <Link className="portal-account-quick-link" href={CATALOG_HOME_PATH}>
              <span className="portal-account-quick-link-label">Browse designs</span>
              <span className="portal-account-quick-link-description">
                Explore the catalog and start a new print request.
              </span>
            </Link>
            <Link className="portal-account-quick-link" href={uploadHref}>
              <span className="portal-account-quick-link-label">Upload designs</span>
              <span className="portal-account-quick-link-description">
                Add your own artwork to a current print request.
              </span>
            </Link>
            <Link className="portal-account-quick-link" href={PORTAL_FAVORITES_HREF}>
              <span className="portal-account-quick-link-label">{favoritesLabel}</span>
              <span className="portal-account-quick-link-description">
                Designs you&apos;ve hearted — open them anytime while they&apos;re in the catalog.
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

      <AccountNotificationsModal
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
      />
    </main>
  );
}
