'use client';

import type { EtsyRecommendationListing } from '@fresh-prints/shared/types/etsyRecommendation/etsyRecommendation.types';

import { openEtsyBrowseWindow } from '../utils/openEtsyBrowseWindow';

interface EtsyListingCardProps {
  listing: EtsyRecommendationListing;
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
      style: 'currency',
      currency: listing.currencyCode || 'USD',
    }).format(amount);
  } catch {
    return listing.currencyCode
      ? `${listing.priceAmount} ${listing.currencyCode}`
      : listing.priceAmount;
  }
}

export function EtsyListingCard({ listing }: EtsyListingCardProps) {
  const price = formatListingPrice(listing);

  return (
    <article className="etsy-listing-card">
      <div className="etsy-listing-card-media">
        {listing.imageUrl ? (
          <img alt="" className="etsy-listing-card-image" loading="lazy" src={listing.imageUrl} />
        ) : (
          <div aria-hidden className="etsy-listing-card-image-placeholder" />
        )}
      </div>
      <div className="etsy-listing-card-body">
        <h3 className="etsy-listing-card-title">{listing.title}</h3>
        {listing.shopName ? <p className="etsy-listing-card-shop">{listing.shopName}</p> : null}
        {price ? <p className="etsy-listing-card-price">{price}</p> : null}
        <a
          className="portal-button portal-button-secondary etsy-listing-card-link"
          href={listing.listingUrl}
          onClick={(event) => {
            event.preventDefault();
            openEtsyBrowseWindow(listing.listingUrl);
          }}
          rel="noopener noreferrer"
          target="_blank"
        >
          View listing
        </a>
      </div>
    </article>
  );
}
