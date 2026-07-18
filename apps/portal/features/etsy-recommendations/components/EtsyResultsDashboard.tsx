'use client';

import Link from 'next/link';
import { useState, type Ref, type RefObject } from 'react';

import { ETSY_RECOMMENDATION_PREVIEW_QUOTA_EXEMPT_UIDS, ETSY_TRADEMARK_STATEMENT } from '@fresh-prints/shared/constants/etsyRecommendation/etsyRecommendation.constants';
import type { EtsyRecommendationListing } from '@fresh-prints/shared/types/etsyRecommendation/etsyRecommendation.types';
import type { EtsyRecommendationPreviewQuota } from '@fresh-prints/shared/types/etsyRecommendation/etsyRecommendationActions.types';
import { ExternalLink, LayoutGrid, Target } from 'lucide-react';

import { useAuth } from '../../auth/context/AuthContext';
import { buildRequestArtworkHref } from '../../print-requests/utils/catalogSelectionNavigation';
import {
  ETSY_PREVIEW_QUOTA_SCOPE_NOTE,
  formatEtsyPreviewQuota,
  ETSY_PREVIEW_QUOTA_UNLIMITED_NOTE,
} from '../utils/formatEtsyPreviewQuota';
import { openEtsyBrowseWindow } from '../utils/openEtsyBrowseWindow';
import { saveEtsyRecommendationUploadAttribution } from '../utils/etsyRecommendationAttributionStorage';
import { buildEtsyRecommendationHref } from '../utils/etsyRecommendationUrlState';
import { EtsyListingCard } from './EtsyListingCard';

interface EtsyResultsDashboardProps {
  actionError: string | null;
  broaderSearchUrl: string;
  etsyRecommendationRequestId: string | null;
  etsySearchUrl: string;
  headingRef: RefObject<HTMLHeadingElement | null>;
  isLoadingListings: boolean;
  isSearchingAgain: boolean;
  listings: EtsyRecommendationListing[];
  listingsMessage: string | null;
  previewQuota: EtsyRecommendationPreviewQuota | null;
  onBackToOptions: () => void;
  onEditSearch: () => void;
  onSearchAgain: () => void;
}

function EtsyBrowseLinkCard({
  ariaLabel,
  badge,
  ctaLabel,
  description,
  href,
  icon: Icon,
  title,
  variant,
}: {
  ariaLabel: string;
  badge: string;
  ctaLabel: string;
  description: string;
  href: string;
  icon: typeof Target;
  title: string;
  variant: 'primary' | 'broader';
}) {
  return (
    <a
      aria-label={ariaLabel}
      className={`etsy-browse-card etsy-browse-card--${variant}`}
      href={href}
      onClick={(event) => {
        if (openEtsyBrowseWindow(href)) {
          event.preventDefault();
        }
      }}
      rel="noopener noreferrer"
      target="_blank"
    >
      <div aria-hidden="true" className="etsy-browse-card-icon">
        <Icon absoluteStrokeWidth strokeWidth={1.25} />
      </div>
      <div className="etsy-browse-card-body">
        <span className={`etsy-browse-card-badge etsy-browse-card-badge--${variant}`}>{badge}</span>
        <h2 className="etsy-browse-card-title">{title}</h2>
        <p className="etsy-browse-card-description">{description}</p>
        <span className="etsy-browse-card-cta">
          {ctaLabel}
          <ExternalLink aria-hidden="true" size={14} strokeWidth={2.25} />
        </span>
      </div>
    </a>
  );
}

function ListingsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading listing previews" className="etsy-listing-grid">
      {Array.from({ length: 6 }, (_, index) => (
        <div className="etsy-listing-card etsy-listing-card--skeleton" key={index}>
          <div className="etsy-listing-card-media etsy-listing-card-image-placeholder" />
          <div className="etsy-listing-card-body">
            <div className="etsy-results-skeleton-line" />
            <div className="etsy-results-skeleton-line etsy-results-skeleton-line-short" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EtsyResultsDashboard({
  actionError,
  broaderSearchUrl,
  etsyRecommendationRequestId,
  etsySearchUrl,
  headingRef,
  isLoadingListings,
  isSearchingAgain,
  listings,
  listingsMessage,
  previewQuota,
  onBackToOptions,
  onEditSearch,
  onSearchAgain,
}: EtsyResultsDashboardProps) {
  const { firebaseUser } = useAuth();
  const isBusy = isSearchingAgain;
  const showBroader = Boolean(broaderSearchUrl) && broaderSearchUrl !== etsySearchUrl;
  const showRefreshResults = firebaseUser?.uid
    ? (ETSY_RECOMMENDATION_PREVIEW_QUOTA_EXEMPT_UIDS as readonly string[]).includes(firebaseUser.uid)
    : false;
  const [purchasePanelOpen, setPurchasePanelOpen] = useState(false);

  const resultsReturnTo = etsyRecommendationRequestId
    ? buildEtsyRecommendationHref({ view: 'results', requestId: etsyRecommendationRequestId })
    : '/custom-designs';

  const uploadHref = buildRequestArtworkHref({
    returnTo: resultsReturnTo,
    ...(etsyRecommendationRequestId
      ? { etsyRecommendationId: etsyRecommendationRequestId }
      : {}),
  });

  function handlePurchasedDesign() {
    if (etsyRecommendationRequestId) {
      saveEtsyRecommendationUploadAttribution({
        etsyRecommendationRequestId,
        reportedPurchased: true,
      });
    }
    setPurchasePanelOpen(true);
  }

  return (
    <section aria-labelledby="etsy-results-title" className="etsy-results etsy-wizard-shell">
      <header className="etsy-results-header">
        <h1 id="etsy-results-title" ref={headingRef as Ref<HTMLHeadingElement>} tabIndex={-1}>
          Browse matching designs
        </h1>
        <p className="portal-muted">
          Preview digital PNG downloads below, or open Etsy in a new tab to browse and purchase from
          independent sellers. Fresh Prints does not sell or fulfill these listings. You can return
          to other design help options anytime.
        </p>
        <p className="etsy-results-specificity-warning" role="note">
          Tip: the listing cards below are only a quick preview. Very specific details can mean
          fewer matches here. For fuller results, rely on Best match or More options. Those open
          Etsy search links and usually find more designs.
        </p>
      </header>

      {etsySearchUrl ? (
        <div className={`etsy-browse-cards${showBroader ? '' : ' etsy-browse-cards--single'}`}>
          <EtsyBrowseLinkCard
            ariaLabel="Open your best-match Etsy search in a new tab"
            badge="Best match"
            ctaLabel="Open on Etsy"
            description="Opens Etsy in a new tab with instant-download PNG listings matched to what you told us, ready to browse and purchase."
            href={etsySearchUrl}
            icon={Target}
            title="Your best-match search"
            variant="primary"
          />
          {showBroader ? (
            <EtsyBrowseLinkCard
              ariaLabel="Open a broader Etsy search in a new tab"
              badge="More options"
              ctaLabel="Browse more on Etsy"
              description="Opens a wider Etsy search with the same instant-download filter when you want more designs to explore."
              href={broaderSearchUrl}
              icon={LayoutGrid}
              title="A broader browse"
              variant="broader"
            />
          ) : null}
        </div>
      ) : null}

      {previewQuota ? (
        <p
          className={`etsy-preview-quota${previewQuota.unlimited ? ' etsy-preview-quota--unlimited' : ''}`}
          role="status"
        >
          {formatEtsyPreviewQuota(previewQuota)}{' '}
          {previewQuota.unlimited ? ETSY_PREVIEW_QUOTA_UNLIMITED_NOTE : ETSY_PREVIEW_QUOTA_SCOPE_NOTE}
        </p>
      ) : null}

      {isLoadingListings ? <ListingsSkeleton /> : null}

      {!isLoadingListings && listings.length > 0 ? (
        <div className="etsy-listing-grid">
          {listings.map((listing) => (
            <EtsyListingCard key={listing.listingId} listing={listing} />
          ))}
        </div>
      ) : null}

      {!isLoadingListings && listingsMessage ? (
        <p className="portal-muted etsy-results-listings-message" role="status">
          {listingsMessage}
        </p>
      ) : null}

      {actionError ? (
        <p className="etsy-field-error" role="alert">
          {actionError}
        </p>
      ) : null}

      <section aria-labelledby="etsy-purchased-title" className="etsy-purchased-panel">
        <h2 className="etsy-purchased-title" id="etsy-purchased-title">
          Purchased a design on Etsy?
        </h2>
        {!purchasePanelOpen ? (
          <>
            <p className="portal-muted">
              If you bought a digital download, you can upload it to add it to your print request.
              This is optional. You can also try other design help options anytime.
            </p>
            <div className="etsy-purchased-actions">
              <button
                className="portal-button portal-button-secondary"
                onClick={handlePurchasedDesign}
                type="button"
              >
                Yes, I purchased a design
              </button>
            </div>
          </>
        ) : (
          <>
            <ol className="etsy-purchased-steps">
              <li>Download your PNG from Etsy (check your Etsy purchases or email).</li>
              <li>Upload the file on the next screen. It attaches to Your Stash.</li>
              <li>Review sizes and quantities before sending to a show.</li>
            </ol>
            <div className="etsy-purchased-actions">
              <Link className="portal-button portal-button-primary" href={uploadHref}>
                Upload your download
              </Link>
              <button
                className="portal-button portal-button-secondary"
                onClick={() => setPurchasePanelOpen(false)}
                type="button"
              >
                Not right now
              </button>
            </div>
          </>
        )}
      </section>

      <div className="etsy-results-actions">
        <button
          className="portal-button portal-button-primary"
          disabled={isBusy}
          onClick={onBackToOptions}
          type="button"
        >
          Back to options
        </button>
        <button
          className="portal-button portal-button-secondary"
          disabled={isBusy}
          onClick={onEditSearch}
          type="button"
        >
          Edit search
        </button>
        {showRefreshResults ? (
          <button
            className="portal-button portal-button-secondary"
            disabled={isBusy || !etsySearchUrl}
            onClick={onSearchAgain}
            type="button"
          >
            {isSearchingAgain ? 'Refreshing…' : 'Refresh results'}
          </button>
        ) : null}
      </div>

      <aside className="etsy-results-disclosure">
        <p className="portal-muted">
          Etsy links open in a new tab with instant-download filters applied. Purchases happen off
          Fresh Prints.
        </p>
        <p className="etsy-trademark-statement">{ETSY_TRADEMARK_STATEMENT}</p>
      </aside>
    </section>
  );
}
