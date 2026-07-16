import { useEffect, useState } from "react";
import { ExternalLink, LayoutGrid, Target } from "lucide-react";

import { desktopAppService } from "../../../shared/services/desktopAppService";
import { useEtsyRecommendationRequests } from "../hooks/useEtsyRecommendationRequests";
import type { EtsyRecommendationRequestListItem } from "../services/etsyRecommendationRequestsService";

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
          Select a saved Portal Find a design search to review answers and open the same Best match
          / broader Etsy links the customer sees. To wipe test searches, use Test Data → Etsy
          searches.
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
