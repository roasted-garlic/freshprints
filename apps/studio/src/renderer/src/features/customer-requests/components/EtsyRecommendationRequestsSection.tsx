import { useEffect, useState } from "react";
import { ExternalLink, LayoutGrid, Target } from "lucide-react";

import type { EtsyRecommendationListing } from "@fresh-prints/shared/types/etsyRecommendation/etsyRecommendation.types";

import { Button } from "../../../shared/components/Button";
import { desktopAppService } from "../../../shared/services/desktopAppService";
import { useEtsyRecommendationRequests } from "../hooks/useEtsyRecommendationRequests";
import {
  etsyRecommendationRequestsService,
  type EtsyRecommendationRequestListItem,
} from "../services/etsyRecommendationRequestsService";

function statusLabel(status: string): string {
  if (status === "active") {
    return "Active";
  }
  if (status === "completed") {
    return "Completed";
  }
  if (status === "cancelled") {
    return "Cancelled";
  }
  return status;
}

function formatCreatedAt(value: Date | null): string {
  if (!value) {
    return "Unknown time";
  }
  return value.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatListingPrice(listing: EtsyRecommendationListing): string | null {
  if (!listing.priceAmount) {
    return null;
  }
  const amount = Number(listing.priceAmount);
  if (!Number.isFinite(amount)) {
    return listing.currencyCode
      ? `${listing.priceAmount} ${listing.currencyCode}`
      : listing.priceAmount;
  }
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: listing.currencyCode || "USD",
    }).format(amount);
  } catch {
    return listing.currencyCode
      ? `${listing.priceAmount} ${listing.currencyCode}`
      : listing.priceAmount;
  }
}

function apiStatusLabel(status: string): string {
  if (status === "ok") {
    return "Results returned";
  }
  if (status === "empty") {
    return "No listings matched";
  }
  if (status === "unavailable") {
    return "API unavailable";
  }
  return status;
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
  variant: "primary" | "broader";
}) {
  return (
    <button
      aria-label={ariaLabel}
      className={`customer-requests-etsy-browse-card customer-requests-etsy-browse-card--${variant}`}
      onClick={() => {
        void desktopAppService.openExternalLink(href);
      }}
      type="button"
    >
      <div aria-hidden="true" className="customer-requests-etsy-browse-card-icon">
        <Icon absoluteStrokeWidth size={88} strokeWidth={1.25} />
      </div>
      <div className="customer-requests-etsy-browse-card-body">
        <span
          className={`customer-requests-etsy-browse-card-badge customer-requests-etsy-browse-card-badge--${variant}`}
        >
          {badge}
        </span>
        <h3 className="customer-requests-etsy-browse-card-title">{title}</h3>
        <p className="customer-requests-etsy-browse-card-description">{description}</p>
        <span className="customer-requests-etsy-browse-card-cta">
          {ctaLabel}
          <ExternalLink aria-hidden="true" size={14} strokeWidth={2.25} />
        </span>
      </div>
    </button>
  );
}

function EtsyApiListingCard({ listing }: { listing: EtsyRecommendationListing }) {
  const price = formatListingPrice(listing);
  return (
    <article className="customer-requests-etsy-api-listing">
      <div className="customer-requests-etsy-api-listing-media">
        {listing.imageUrl ? (
          <img
            alt=""
            className="customer-requests-etsy-api-listing-image"
            loading="lazy"
            src={listing.imageUrl}
          />
        ) : (
          <div aria-hidden className="customer-requests-etsy-api-listing-placeholder" />
        )}
      </div>
      <div className="customer-requests-etsy-api-listing-body">
        <h4 className="customer-requests-etsy-api-listing-title">{listing.title}</h4>
        {listing.shopName ? (
          <p className="customer-requests-etsy-api-listing-meta">{listing.shopName}</p>
        ) : null}
        {price ? <p className="customer-requests-etsy-api-listing-meta">{price}</p> : null}
        <Button
          onClick={() => {
            void desktopAppService.openExternalLink(listing.listingUrl);
          }}
          size="sm"
          type="button"
          variant="secondary"
        >
          View listing
          <ExternalLink aria-hidden="true" size={14} strokeWidth={2.25} />
        </Button>
      </div>
    </article>
  );
}

function EtsyApiResultsPanel({ item }: { item: EtsyRecommendationRequestListItem }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    setIsOpen(false);
    setFetchError(null);
    setIsFetching(false);
  }, [item.id]);

  const snapshot = item.lastApiSearch;

  async function handleFetch() {
    setIsFetching(true);
    setFetchError(null);
    try {
      await etsyRecommendationRequestsService.fetchApiResults(item.id);
      setIsOpen(true);
    } catch (error) {
      setFetchError(
        error instanceof Error && error.message
          ? error.message
          : "Unable to fetch Etsy API results.",
      );
    } finally {
      setIsFetching(false);
    }
  }

  return (
    <div className="customer-requests-etsy-api-results">
      <div className="customer-requests-etsy-api-results-actions">
        <Button
          onClick={() => setIsOpen((open) => !open)}
          size="sm"
          type="button"
          variant="secondary"
        >
          {isOpen ? "Hide API results" : "View API results"}
        </Button>
        <Button
          disabled={isFetching}
          onClick={() => {
            void handleFetch();
          }}
          size="sm"
          type="button"
          variant="secondary"
        >
          {isFetching
            ? "Fetching…"
            : snapshot
              ? "Refresh API results"
              : "Fetch API results"}
        </Button>
      </div>

      {fetchError ? (
        <p className="auth-message auth-message-error" role="alert">
          {fetchError}
        </p>
      ) : null}

      {isOpen ? (
        <div className="customer-requests-etsy-api-results-panel" aria-live="polite">
          {!snapshot ? (
            <p className="settings-field-hint">
              No Open API snapshot stored yet. Use Fetch API results to run the same search Studio
              staff need, or wait until the customer loads listing previews in Portal.
            </p>
          ) : (
            <>
              <dl className="customer-requests-etsy-detail-summary">
                <div className="customer-requests-etsy-detail-row">
                  <dt>API status</dt>
                  <dd>{apiStatusLabel(snapshot.status)}</dd>
                </div>
                <div className="customer-requests-etsy-detail-row">
                  <dt>Last searched</dt>
                  <dd>{formatCreatedAt(snapshot.searchedAt)}</dd>
                </div>
                {snapshot.apiKeywordsUsed ? (
                  <div className="customer-requests-etsy-detail-row">
                    <dt>API keywords</dt>
                    <dd className="customer-requests-etsy-query">{snapshot.apiKeywordsUsed}</dd>
                  </div>
                ) : null}
                {snapshot.keywordStrategy ? (
                  <div className="customer-requests-etsy-detail-row">
                    <dt>Keyword strategy</dt>
                    <dd>{snapshot.keywordStrategy}</dd>
                  </div>
                ) : null}
              </dl>

              {snapshot.listings.length === 0 ? (
                <p className="settings-field-hint">
                  {snapshot.status === "unavailable"
                    ? "The Open API key was missing or unavailable when this snapshot was saved."
                    : "The Open API returned no listing previews for these keywords."}
                </p>
              ) : (
                <div className="customer-requests-etsy-api-listing-grid">
                  {snapshot.listings.map((listing) => (
                    <EtsyApiListingCard key={listing.listingId} listing={listing} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

function EtsySearchDetail({ item }: { item: EtsyRecommendationRequestListItem }) {
  const title = item.subjectSummary || item.canonicalQuery || "Untitled search";
  const showBroader =
    Boolean(item.broaderSearchUrl) && item.broaderSearchUrl !== item.etsySearchUrl;

  return (
    <div className="customer-requests-etsy-detail">
      <header className="customer-requests-etsy-detail-header">
        <h3 className="customer-requests-etsy-detail-title">{title}</h3>
        <p className="settings-field-hint">
          {item.customerDisplayName} · {statusLabel(item.status)} · {formatCreatedAt(item.createdAt)}
        </p>
      </header>

      <dl className="customer-requests-etsy-detail-summary">
        <div className="customer-requests-etsy-detail-row">
          <dt>Person, place, or thing</dt>
          <dd>{item.subjectSummary || "—"}</dd>
        </div>
        <div className="customer-requests-etsy-detail-row">
          <dt>Tone / style</dt>
          <dd>{item.styleSummary || "—"}</dd>
        </div>
        <div className="customer-requests-etsy-detail-row">
          <dt>Words / scene</dt>
          <dd>{item.wording || "—"}</dd>
        </div>
        <div className="customer-requests-etsy-detail-row">
          <dt>Canonical query</dt>
          <dd className="customer-requests-etsy-query">{item.canonicalQuery || "—"}</dd>
        </div>
      </dl>

      {item.etsySearchUrl ? (
        <div
          className={`customer-requests-etsy-browse-cards${showBroader ? "" : " is-single"}`}
        >
          <EtsyBrowseLinkCard
            ariaLabel="Open best-match Etsy search in a new tab"
            badge="Best match"
            ctaLabel="Open on Etsy"
            description="Opens Etsy with instant-download PNG listings matched to what the customer entered."
            href={item.etsySearchUrl}
            icon={Target}
            title="Best-match search"
            variant="primary"
          />
          {showBroader ? (
            <EtsyBrowseLinkCard
              ariaLabel="Open a broader Etsy search in a new tab"
              badge="More options"
              ctaLabel="Browse more on Etsy"
              description="Opens a wider Etsy search with the same instant-download filter."
              href={item.broaderSearchUrl}
              icon={LayoutGrid}
              title="A broader browse"
              variant="broader"
            />
          ) : null}
        </div>
      ) : null}

      <EtsyApiResultsPanel item={item} />
    </div>
  );
}

export function EtsyRecommendationRequestsSection() {
  const { items, isLoading, error } = useEtsyRecommendationRequests();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (items.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !items.some((item) => item.id === selectedId)) {
      setSelectedId(items[0]?.id ?? null);
    }
  }, [items, selectedId]);

  const selected = items.find((item) => item.id === selectedId) ?? null;

  return (
    <section
      aria-labelledby="etsy-recommendation-requests-title"
      className="card settings-section customer-requests-etsy-searches"
    >
      <header className="settings-section-header">
        <h2 className="settings-section-title" id="etsy-recommendation-requests-title">
          Etsy searches
        </h2>
        <p className="settings-section-description">
          Select a saved Portal Find a design search to review answers, open the same Best match /
          broader Etsy links the customer sees, and view the Open API listing results (or fetch them
          for staff). To wipe test searches, use Test Data → Etsy searches.
        </p>
      </header>

      {error ? (
        <p className="auth-message auth-message-error" role="alert">
          {error}
          {error.toLowerCase().includes("permission") ? (
            <> Staff read access may not be deployed yet for this Firebase project.</>
          ) : null}
        </p>
      ) : null}

      {isLoading ? (
        <p className="settings-section-status">Loading Etsy searches…</p>
      ) : items.length === 0 && !error ? (
        <p className="settings-section-status">No saved Etsy searches yet.</p>
      ) : items.length > 0 ? (
        <div className="customer-requests-etsy-split">
          <div
            aria-label="Saved Etsy searches"
            className="customer-requests-etsy-list"
            role="listbox"
          >
            {items.map((item) => {
              const isSelected = item.id === selectedId;
              const title = item.subjectSummary || item.canonicalQuery || "Untitled search";
              return (
                <button
                  aria-selected={isSelected}
                  className={`customer-requests-etsy-list-card${isSelected ? " is-selected" : ""}`}
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  role="option"
                  type="button"
                >
                  <span className="customer-requests-etsy-list-card-title">{title}</span>
                  <span className="customer-requests-etsy-list-card-meta">
                    {item.customerDisplayName}
                  </span>
                  <span className="customer-requests-etsy-list-card-meta">
                    {formatCreatedAt(item.createdAt)}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="customer-requests-etsy-detail-pane" aria-live="polite">
            {selected ? (
              <EtsySearchDetail item={selected} />
            ) : (
              <p className="settings-section-status">Select a search to view details.</p>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
