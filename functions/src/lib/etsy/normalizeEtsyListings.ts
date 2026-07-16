import {
  ETSY_RECOMMENDATION_DISPLAY_LIMIT,
} from "../../../../packages/shared/src/constants/etsyRecommendation/etsyRecommendation.constants";
import type { EtsyRecommendationListing } from "../../../../packages/shared/src/types/etsyRecommendation/etsyRecommendation.types";
import { sanitizeEtsyListingUrl } from "../../../../packages/shared/src/utils/etsyRecommendationListingUrl";

import type { EtsyRawListing } from "./etsyClient.types";

function asFinitePositiveInt(value: unknown): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) {
    return null;
  }
  return n;
}

function sanitizeTitle(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed) {
    return null;
  }
  return trimmed.slice(0, 300);
}

function pickImageUrl(raw: EtsyRawListing): string | null {
  const images = raw.images;
  if (!Array.isArray(images) || images.length === 0) {
    return null;
  }
  const first = images[0] as Record<string, unknown>;
  for (const key of ["url_570xN", "url_fullxfull", "url_75x75"]) {
    const candidate = first[key];
    if (typeof candidate === "string" && candidate.startsWith("https://")) {
      return candidate;
    }
  }
  return null;
}

function pickShopName(raw: EtsyRawListing): string | null {
  const shop = raw.shop;
  if (shop == null || typeof shop !== "object" || Array.isArray(shop)) {
    return null;
  }
  const name = (shop as Record<string, unknown>).shop_name;
  if (typeof name !== "string" || !name.trim()) {
    return null;
  }
  return name.trim().slice(0, 120);
}

/**
 * Normalize Etsy money-like payloads.
 * Expected shape: { amount, divisor, currency_code }.
 */
export function normalizeEtsyPrice(price: unknown): {
  priceAmount: string | null;
  currencyCode: string | null;
} {
  if (price == null || typeof price !== "object" || Array.isArray(price)) {
    return { priceAmount: null, currencyCode: null };
  }
  const record = price as Record<string, unknown>;
  const amount = Number(record.amount);
  const divisor = Number(record.divisor);
  const currencyCode =
    typeof record.currency_code === "string" && record.currency_code.trim()
      ? record.currency_code.trim().toUpperCase()
      : null;

  if (!Number.isFinite(amount) || !Number.isFinite(divisor) || divisor <= 0) {
    return { priceAmount: null, currencyCode };
  }

  const value = amount / divisor;
  const priceAmount = Number.isInteger(value) ? String(value) : value.toFixed(2);
  return { priceAmount, currencyCode };
}

export function normalizeEtsyListing(raw: EtsyRawListing): EtsyRecommendationListing | null {
  const listingId = asFinitePositiveInt(raw.listing_id);
  const title = sanitizeTitle(raw.title);
  const listingUrl = sanitizeEtsyListingUrl(raw.url);
  if (listingId == null || !title || !listingUrl) {
    return null;
  }

  const { priceAmount, currencyCode } = normalizeEtsyPrice(raw.price);
  return {
    listingId,
    title,
    listingUrl,
    imageUrl: pickImageUrl(raw),
    shopName: pickShopName(raw),
    priceAmount,
    currencyCode,
  };
}

export function normalizeEtsyListings(
  rawListings: EtsyRawListing[],
  displayLimit = ETSY_RECOMMENDATION_DISPLAY_LIMIT,
): EtsyRecommendationListing[] {
  const out: EtsyRecommendationListing[] = [];
  const seen = new Set<number>();
  for (const raw of rawListings) {
    const listing = normalizeEtsyListing(raw);
    if (!listing || seen.has(listing.listingId)) {
      continue;
    }
    seen.add(listing.listingId);
    out.push(listing);
    if (out.length >= displayLimit) {
      break;
    }
  }
  return out;
}

/** Merge hydration fields onto search rows by listing_id without dropping base rows. */
export function mergeHydratedListings(
  searchRows: EtsyRawListing[],
  hydratedRows: EtsyRawListing[],
): EtsyRawListing[] {
  const byId = new Map<number, EtsyRawListing>();
  for (const row of hydratedRows) {
    const id = asFinitePositiveInt(row.listing_id);
    if (id != null) {
      byId.set(id, row);
    }
  }
  return searchRows.map((row) => {
    const id = asFinitePositiveInt(row.listing_id);
    if (id == null) {
      return row;
    }
    const hydrated = byId.get(id);
    if (!hydrated) {
      return row;
    }
    return {
      ...row,
      ...hydrated,
      title: hydrated.title ?? row.title,
      url: hydrated.url ?? row.url,
      price: hydrated.price ?? row.price,
      images: hydrated.images ?? row.images,
      shop: hydrated.shop ?? row.shop,
    };
  });
}
